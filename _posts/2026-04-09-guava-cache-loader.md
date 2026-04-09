---
layout: post
title: 深入 Guava Cache 源码：`get(key, Callable)` 如何保证 Loader 只执行一次
category: java
tags: ['java', 'guava']
---

# 深入 Guava Cache 源码：`get(key, Callable)` 如何保证 Loader 只执行一次

## 引言

在高并发场景下，本地缓存是抵御下游服务压力的第一道防线。Guava Cache 的 `Cache.get(key, Callable)` 方法有一个重要承诺：**对于同一个 key，即使有 100 个线程同时 cache miss，Callable（loader）也只会被执行一次**，其余线程阻塞等待结果。

这个看似简单的语义背后，隐藏着一套精巧的并发控制设计。本文将从源码层面，逐层拆解其实现原理。

> 本文基于 Guava 31.x 版本分析，核心逻辑在各版本中保持一致。

---

## 一、整体架构：从 ConcurrentHashMap 说起

Guava `LocalCache` 的架构直接借鉴了 Java 7 `ConcurrentHashMap` 的**分段锁（Segment）**设计：

```
LocalCache
├── Segment[0]  ── [Entry] → [Entry] → ...
├── Segment[1]  ── [Entry] → [Entry] → ...
├── Segment[2]  ── [Entry] → [Entry] → ...
├── ...
└── Segment[n]  ── [Entry] → [Entry] → ...
```

- 整个 Cache 被分成若干个 **Segment**（默认 4 个，根据 `concurrencyLevel` 决定）
- 每个 Segment 管理一组 hash 桶，桶内是链表结构
- **每个 Segment 本身就是一把 `ReentrantLock`**

```java
static class Segment<K, V> extends ReentrantLock implements Serializable {
    volatile AtomicReferenceArray<ReferenceEntry<K, V>> table; // hash 桶数组
    int count;  // volatile，当前 segment 中的 entry 数量
    // ...
}
```

一个 key 通过 hash 值定位到某个 Segment，后续所有操作都在该 Segment 上完成。不同 Segment 之间**完全独立、互不阻塞**。

---

## 二、调用链路总览

当我们调用 `cache.get(key, callable)` 时，经历以下调用链：

```
cache.get(key, callable)                        // 入口
  └─ LocalManualCache.get(key, callable)        // 包装 Callable → CacheLoader
       └─ LocalCache.get(key, loader)           // 计算 hash，定位 Segment
            └─ Segment.get(key, hash, loader)   // 核心逻辑
                 ├─ 快速路径：无锁读命中 → 直接返回
                 ├─ 发现其他线程正在加载 → waitForLoadingValue()
                 └─ 未命中 → lockedGetOrLoad()  // 加锁加载
                      ├─ 我是第一个 → loadSync()     → 执行 loader
                      └─ 别人先到了 → waitForLoadingValue() → 等待结果
```

下面逐层拆解。

---

## 三、第一层入口：Callable 包装为 CacheLoader

```java
// LocalManualCache.get
public V get(K key, final Callable<? extends V> valueLoader) throws ExecutionException {
    return localCache.get(key, new CacheLoader<Object, V>() {
        @Override
        public V load(Object key) throws Exception {
            return valueLoader.call();
        }
    });
}
```

很简单——把用户传入的 `Callable` 包装成 `CacheLoader`，委托给 `LocalCache.get()`。

```java
// LocalCache.get
V get(K key, CacheLoader<? super K, V> loader) throws ExecutionException {
    int hash = hash(checkNotNull(key));
    return segmentFor(hash).get(key, hash, loader);
}
```

通过 hash 定位到 Segment，进入核心逻辑。

---

## 四、第二层核心：`Segment.get()` —— 三条路径

这是整个设计的关键入口，包含三条执行路径：

```java
V get(K key, int hash, CacheLoader<? super K, V> loader) throws ExecutionException {
    checkNotNull(key);
    checkNotNull(loader);
    try {
        if (count != 0) { // ① volatile 读，保证可见性
            ReferenceEntry<K, V> e = getEntry(key, hash); // ② 无锁查找
            if (e != null) {
                V value = getLiveValue(e, now);
                if (value != null) {
                    // ===== 路径 A：缓存命中，直接返回 =====
                    recordRead(e, now);
                    statsCounter.recordHits(1);
                    return scheduleRefresh(e, key, hash, value, now, loader);
                }
                ValueReference<K, V> valueReference = e.getValueReference();
                if (valueReference.isLoading()) {
                    // ===== 路径 B：其他线程正在加载，等待结果 =====
                    return waitForLoadingValue(e, key, valueReference);
                }
            }
        }
        // ===== 路径 C：未命中，加锁加载 =====
        return lockedGetOrLoad(key, hash, loader);
    } catch (...) { ... }
}
```

**三条路径的设计意图**：

| 路径 | 条件 | 操作 | 是否加锁 |
|------|------|------|---------|
| **A** | entry 存在且未过期 | 直接返回缓存值 | ❌ 无锁 |
| **B** | entry 存在但正在被加载 | 阻塞等待加载完成 | ❌ 无锁 |
| **C** | entry 不存在或已过期 | 加锁后执行加载 | ✅ 加锁 |

注意路径 B：如果在无锁阶段就发现 `isLoading() == true`，说明已经有线程在加载了，**连锁都不用抢**，直接等就行。这是一个重要的优化——减少了锁竞争。

### `count` 的妙用

```java
if (count != 0) {
```

`count` 是 `volatile int`，对它的读操作构成了一个**内存屏障（Memory Barrier）**。这保证了后续读取 `table` 数组时，能看到其他线程最新写入的 entry。这个技巧直接来自 `ConcurrentHashMap`。

---

## 五、第三层关键：`lockedGetOrLoad()` —— 加锁决策

这是保证 "loader 只执行一次" 的核心方法。它分为**两个阶段**：

### 阶段一：持锁 —— 决定"谁来加载"

```java
V lockedGetOrLoad(K key, int hash, CacheLoader<? super K, V> loader)
    throws ExecutionException {

    ReferenceEntry<K, V> e;
    ValueReference<K, V> valueReference = null;
    LoadingValueReference<K, V> loadingValueReference = null;
    boolean createNewEntry = true;

    lock();  // ★ Segment 本身就是 ReentrantLock
    try {
        long now = map.ticker.read();
        preWriteCleanup(now); // 清理过期 entry

        AtomicReferenceArray<ReferenceEntry<K, V>> table = this.table;
        int index = hash & (table.length() - 1);
        ReferenceEntry<K, V> first = table.get(index);

        // 持锁状态下再次查找（Double-Check）
        for (e = first; e != null; e = e.getNext()) {
            K entryKey = e.getKey();
            if (e.getHash() == hash && entryKey != null
                && map.keyEquivalence.equivalent(key, entryKey)) {

                valueReference = e.getValueReference();

                if (valueReference.isLoading()) {
                    // ★ 别的线程已经在加载了 → 我不需要再加载
                    createNewEntry = false;
                } else {
                    V value = valueReference.get();
                    if (value == null) {
                        // 被 GC 回收，需重新加载
                    } else if (map.isExpired(e, now)) {
                        // 已过期，需重新加载
                    } else {
                        // ★ 值有效！（等锁期间被别人加载好了）
                        recordLockedRead(e, now);
                        statsCounter.recordHits(1);
                        return value;
                    }
                }
                break;
            }
        }

        // ★★★ 关键：创建 LoadingValueReference 占位符 ★★★
        if (createNewEntry) {
            loadingValueReference = new LoadingValueReference<>();
            if (e == null) {
                e = newEntry(key, hash, first);
                e.setValueReference(loadingValueReference);
                table.set(index, e);
            } else {
                e.setValueReference(loadingValueReference);
            }
        }
    } finally {
        unlock(); // ★ 释放锁！实际加载在锁外进行
    }

    // 阶段二（见下文）
}
```

**核心设计**：在持锁期间，**不执行任何耗时操作**，只做一件事——在 hash 桶中放入一个 `LoadingValueReference` 占位符。这个占位符的 `isLoading()` 返回 `true`，相当于一面旗帜："我已经安排人去加载了，你们别重复劳动"。

### 阶段二：释放锁后 —— 分道扬镳

```java
    // 紧接 unlock() 之后
    if (createNewEntry) {
        // ★ 我是第一个线程 → 负责执行 loader
        return loadSync(key, hash, loadingValueReference, loader);
    } else {
        // ★ 别的线程已在加载 → 我等待结果
        return waitForLoadingValue(e, key, valueReference);
    }
}
```

锁释放后，后续线程获得锁进入阶段一，发现 `isLoading() == true`，就走 `waitForLoadingValue` 等待。**自始至终只有第一个获得锁的线程会执行 loader。**

---

## 六、`LoadingValueReference`：线程间通信的桥梁

这是整个设计最精妙的数据结构。它做了两件事：

1. **标记状态**：`isLoading()` 返回 `true`，告诉后续线程"正在加载中"
2. **传递结果**：内部持有 `SettableFuture`，用于线程间传递加载结果

```java
static class LoadingValueReference<K, V> implements ValueReference<K, V> {

    volatile ValueReference<K, V> oldValue;

    // ★ 核心：一个可手动设值的 Future
    final SettableFuture<V> futureValue = SettableFuture.create();

    final Stopwatch stopwatch = Stopwatch.createUnstarted();

    @Override
    public boolean isLoading() {
        return true;  // 永远返回 true，标识"加载中"
    }

    // 加载线程调用：设置结果，唤醒所有等待者
    public boolean set(@Nullable V newValue) {
        return futureValue.set(newValue);
    }

    // 加载线程调用：设置异常，等待者也会收到异常
    public boolean setException(Throwable t) {
        return futureValue.setException(t);
    }

    // 等待线程调用：阻塞直到结果就绪
    public V waitForValue() throws ExecutionException {
        return getUninterruptibly(futureValue);
    }
}
```

`SettableFuture` 是 Guava 对 `CompletableFuture` 的实现，底层基于 `AbstractQueuedSynchronizer (AQS)`：
- `set(value)` → 将状态设为完成，`LockSupport.unpark()` 唤醒所有等待线程
- `get()` → 如果未完成，`LockSupport.park()` 阻塞当前线程

---

## 七、加载线程：`loadSync()`

第一个拿到锁的线程执行 `loadSync`，真正调用用户的 Callable：

```java
V loadSync(K key, int hash,
    LoadingValueReference<K, V> loadingValueReference,
    CacheLoader<? super K, V> loader) throws ExecutionException {

    ListenableFuture<V> loadingFuture =
        loadingValueReference.loadFuture(key, loader);
    return getAndRecordStats(key, hash, loadingValueReference, loadingFuture);
}
```

```java
// LoadingValueReference.loadFuture
public ListenableFuture<V> loadFuture(K key, CacheLoader<? super K, V> loader) {
    try {
        stopwatch.start();

        V newValue = loader.load(key);  // ★★★ 执行用户的 Callable ★★★

        if (newValue != null) {
            set(newValue);  // ★ futureValue.set() → 唤醒等待线程
        }
        return futureValue;
    } catch (Throwable t) {
        setException(t);    // ★ futureValue.setException() → 等待线程收到异常
        throw ...;
    }
}
```

```java
// 将加载结果正式写入 Segment
V getAndRecordStats(...) throws ExecutionException {
    V value = getUninterruptibly(newValue);
    statsCounter.recordLoadSuccess(loadTime);

    // ★ 再次加锁，将 LoadingValueReference 替换为真正的值
    storeLoadedValue(key, hash, loadingValueReference, value);
    return value;
}
```

注意 `storeLoadedValue` 会再次 `lock()` Segment，将 entry 的 `ValueReference` 从 `LoadingValueReference`（临时占位）替换为 `StrongValueReference`（持有真正的值）。此后新来的线程在无锁阶段就能直接命中缓存。

---

## 八、等待线程：`waitForLoadingValue()`

后续线程发现 `isLoading() == true` 后，进入等待：

```java
V waitForLoadingValue(ReferenceEntry<K, V> e, K key,
    ValueReference<K, V> valueReference) throws ExecutionException {

    // 安全检查：不能在持锁时等待（会死锁）
    checkState(!Thread.holdsLock(this),
        "Recursive load of: %s", key);

    V value = valueReference.waitForValue();  // ★ 阻塞在 Future.get()

    if (value == null) {
        throw new InvalidCacheLoadException(
            "CacheLoader returned null for key " + key);
    }
    statsCounter.recordHits(1);  // 对等待线程来说，算作一次"命中"
    return value;
}
```

等待线程最终和加载线程拿到**同一个对象引用**——不存在拷贝，是真正的共享。

---

## 九、异常处理：loader 抛异常怎么办？

如果 loader 执行过程中抛出异常：

```java
// LoadingValueReference.loadFuture 中
catch (Throwable t) {
    setException(t);  // Future 被设置为异常状态
}
```

所有调用 `waitForValue()` 的等待线程会收到 `ExecutionException`（包装了原始异常）。

**关键点：异常不会被缓存。** `storeLoadedValue` 不会被调用，`LoadingValueReference` 会被移除。下次请求同一个 key 时，会重新走一遍完整的加载流程。

---

## 十、完整并发时序图

以 3 个线程同时请求同一个 key（cache miss）为例：

```
时间轴 →

Thread A                    Thread B                    Thread C
  │                           │                           │
  ├─ Segment.get()            ├─ Segment.get()            ├─ Segment.get()
  ├─ count≠0? 查 entry        ├─ count≠0? 查 entry        ├─ count≠0? 查 entry
  ├─ 未找到                    ├─ 未找到                    ├─ 未找到
  ├─ → lockedGetOrLoad()      ├─ → lockedGetOrLoad()      ├─ → lockedGetOrLoad()
  │                           │                           │
  ├─ lock() ✅ 获得锁          ├─ lock() ❌ 阻塞            ├─ lock() ❌ 阻塞
  ├─ 查 entry → null          │   ...                     │   ...
  ├─ new LoadingValueRef ★    │   ...                     │   ...
  ├─ 放入 table               │   ...                     │   ...
  ├─ unlock()                 │   ...                     │   ...
  │   │                       ├─ lock() ✅ 获得锁          │   ...
  │   │                       ├─ 查 entry → 找到了         │   ...
  │   │                       ├─ isLoading()? → true ★    │   ...
  │   │                       ├─ createNewEntry = false    │   ...
  │   │                       ├─ unlock()                 │   ...
  │   │                       │   │                       ├─ lock() ✅ 获得锁
  │   │                       │   │                       ├─ isLoading()? → true ★
  │   │                       │   │                       ├─ createNewEntry = false
  │   │                       │   │                       ├─ unlock()
  │   │                       │   │                       │   │
  ├─ loadSync()               ├─ waitForLoadingValue()    ├─ waitForLoadingValue()
  ├─ loader.load(key)         ├─ future.get() 阻塞        ├─ future.get() 阻塞
  │   ... 耗时操作 ...         │   ...                     │   ...
  ├─ future.set(value) ──────→├─ 被唤醒 ✅                 │   ...
  │               └──────────→│                           ├─ 被唤醒 ✅
  ├─ storeLoadedValue()       │                           │
  ├─ return value             ├─ return value             ├─ return value
```

**整个过程中，`loader.load(key)` 只被 Thread A 执行了一次。**

---

## 十一、设计精髓总结

整个机制可以提炼为 **四重保证**：

| 层次 | 机制 | 作用 |
|------|------|------|
| **Segment 分段锁** | `Segment extends ReentrantLock` | 保证同一时刻只有一个线程能为某 key 创建 `LoadingValueReference` |
| **LoadingValueReference** | `isLoading()` 返回 `true` | 后续线程在锁内看到标记，放弃加载，转为等待 |
| **SettableFuture** | `set()` / `get()` | 加载线程与等待线程之间的结果传递通道 |
| **锁外加载** | `loadSync` 在 `unlock()` 后执行 | loader 执行期间不持有 Segment 锁，不阻塞其他 key 的操作 |

用一句话总结：**用分段锁做互斥决策，用 Future 做线程间结果传递，把实际加载放在锁外以最小化锁持有时间。**

---

## 十二、对比其他方案

为什么不用更简单的方式？

### 方案 A：`synchronized` + 双重检查

```java
synchronized(this) {
    value = map.get(key);
    if (value == null) {
        value = loader.load(key);  // ★ 持锁期间执行加载
        map.put(key, value);
    }
}
```

**问题**：loader 在锁内执行。如果 loader 耗时 1 秒，同一个 Segment 下**所有 key** 的读写都被阻塞 1 秒。

### 方案 B：`ConcurrentHashMap.computeIfAbsent`（Java 8+）

```java
map.computeIfAbsent(key, k -> loader.load(k));
```

**问题**：`computeIfAbsent` 的 lambda 也是在持有桶锁期间执行的（Java 8 实现中持有 `synchronized(node)`），同样会阻塞同桶的其他 key。且不支持过期策略。

### Guava 的方案：锁内只做标记，锁外做加载

```
lock()   → 放入 LoadingValueReference → unlock()
                                           ↓
                                      loader.load(key)  // 锁外！
                                           ↓
                                 lock() → 存入结果 → unlock()
```

**优势**：锁持有时间极短（微秒级），只包含 hash 查找和指针赋值。loader 执行期间（可能毫秒到秒级），Segment 锁是释放的，其他 key 的读写完全不受影响。

---

## 十三、实战建议

### 使用 `get(key, Callable)` 而不是 `getIfPresent + put`

```java
// ❌ 错误：存在并发穿透
V value = cache.getIfPresent(key);
if (value == null) {
    value = loadFromDB(key);
    cache.put(key, value);
}

// ✅ 正确：同一 key 只加载一次
V value = cache.get(key, () -> loadFromDB(key));
```

### 注意异常语义

`Cache.get(key, Callable)` 在 loader 抛异常时，会抛出 `ExecutionException`。如果你的降级逻辑需要区分"加载失败"和"其他错误"，需要 unwrap：

```java
try {
    return cache.get(key, () -> loadFromRemote(key));
} catch (ExecutionException e) {
    Throwable cause = e.getCause(); // 拿到 loader 的原始异常
    if (cause instanceof RateLimitException) {
        // 限流重试...
    }
    return fallbackValue;
}
```

### 注意返回值的不可变性

`get` 返回的对象和缓存中存储的是**同一个引用**。如果调用方修改了返回对象，缓存中的数据也会被改变。建议存入缓存前用 `Collections.unmodifiableXxx()` 包装。

---

## 参考

- [Guava CachesExplained - GitHub Wiki](https://github.com/google/guava/wiki/CachesExplained)
- Guava 源码：`com.google.common.cache.LocalCache`
- Doug Lea, *"The java.util.concurrent Synchronizer Framework"*
