---
layout: post
title: C++ 模板的特化实例讲解
category: c++
tags: ['c++', 'template']
---

# 概述

2022 年，Meta 发布了一篇论文《[Velox: Meta’s Unified Execution Engine](https://research.facebook.com/publications/velox-metas-unified-execution-engine/)》，介绍了一个新的计算引擎 Velox，其愿景是做一个通用的单机计算引擎，可以用来在 Meta 中的各种需要计算的组件中使用。

目前开源社区中已经有一些在使用 Velox 引擎了。Meta 的 [Presto](https://github.com/prestodb/presto) 中有一个 presto-native-engine 的方向，在开发 C++ worker 来替换现有的 Java Worker。另外，[Gluten](https://github.com/oap-project/gluten) 是作 Spark 的 C++ 引擎插件，也使用 Velox 作为其中的一个引擎（另外一个引擎是 ClickHouse）。

本文不是介绍 Velox，只是笔者对 Velox 代码进行了一些阅读，分析了其中 Type 计算 hash 的部分逻辑，来提取其实现逻辑，作为一个 C++ 模板特化的学习示例。

# Velox hash 逻辑

Velox Type 的 hash 计算逻辑主要在两个地方：
1. VectorHasher，作为一个 hash 整体计算的入口，其中的 hashOne 方法是实际计算单列数据的 hash
2. BaseVector 的接口中预留了 hashValueAt 方法，来计算 Vector 中某一个值的 hash 值

这二者起始存在一定的重复，hash 计算整体分为两类：
1. 基础类型：直接使用了 folly::hasher 计算，对于自定义的类型（Timestamp 等），也实现了对应的 hasher，folly 是 Meta 的 C++ 基础库，所以 Velox 中大量使用了 folly（与 Presto 中使用 airlift 一样）
2. 复杂类型：通过基础类型计算的 hash，combine hash 来计算最终的 hash

下面开始讲解如何实现一个等价的 hasher，复杂类型使用 STL 的 vector 和 map 来模拟，其完整代码在[这里](https://github.com/icejoywoo/cxx_snippets/blob/master/velox_/velox_hasher.cpp)。

## Primitive Type hasher

首先定义一个 hasher 接口。

```cpp
template <typename T>
struct hasher;
```

这个代码是直接从 folly 中抄过来的，这里是一个通用的接口，但是没有任何实现。struct 和 class 的作用差不多，这里面没有任何实现，所以当后续定义的特化实现没有被命中后，就会直接报错，这是一个挺好的实践。

### Bool

当需要实现一个 bool 的 hasher 的时候，就需要进行特化。
 
```cpp
template <>
struct hasher<bool> {
  constexpr size_t operator()(bool key) const noexcept {
    // Make sure that all the output bits depend on the input.
    return key ? std::numeric_limits<size_t>::max() : 0;
  }
};
```

这样当使用 `hasher<bool>{}(true)` 就可以进行调用了，这里重载实现了 `operator()`，使得其调用起来像一个方法。

基础类型大概有四类：bool、浮点数、整数（包含 char）、string，其中，bool 和 string 是上面这种简单直接的方式，而浮点数和整数使用了额外实现自己的 hasher，再对 hasher 进行特化，这样来减少代码的重复。下面我们以浮点数为例来看一下。

### Float

浮点数实现一个通用的 float_hasher，其逻辑就是直接将内存中的数据强转成 uint64_t 来进行计算。


```cpp
template <typename F>
struct float_hasher {
  size_t operator()(F const& f) const noexcept {
    static_assert(sizeof(F) <= 8, "Input type is too wide");

    // F{} 是调用构造函数，对于 float 和 double 来说就是 0
    if (f == F{}) { // Ensure 0 and -0 get the same hash.
      return 0;
    }

    uint64_t u64 = 0;
    memcpy(&u64, &f, sizeof(F));
    // uint64_t twang_mix64(uint64_t key)，twang_mix64 是计算hash的函数
    return static_cast<size_t>(twang_mix64(u64));
  }
};
```

下面就可以根据上面的实现，来实现 float 和 double 的特化，这样来保证类型更好的适配，并且浮点数的实现逻辑也都在一个地方。

```cpp
template <>
struct hasher<float> : float_hasher<float> {};

template <>
struct hasher<double> : float_hasher<double> {};
```

通过hasher 特化和继承 float_hasher 的方式，来完成了浮点数 hasher 的实现。

基本类型的 hasher 实现就分为这两种方式，下面我们看看复杂类型的 hasher 实现。

## Complex Type hasher

Velox 中的复杂类型有三个：Array、Map、Row。
* `Array<T>` 就是数组，类型都是相同的
* `Map<Key, Value>` 是 map/dict，有两个类型
* `Row<T, ...Args>` 类似数组的结果，但是每个类型是可以不同的，类似于 Hive 的 Struct 类型，或者 Presto 的 Row 类型

### Array

通过 hashArray 方法来实现 vector 的 hash 计算，逻辑上就是使用 hasher 计算每个元素的 hash，然后将其进行 combine 就获得了最后的结果。

```cpp
static constexpr uint64_t nullHash = 1;
template <typename T>
uint64_t hashArray(
    uint64_t hash,
    const std::vector<T>& elements) {
  for (auto i = 0; i < elements.size(); ++i) {
    auto elementHash = hasher<T>{}(elements[i]);
    hash = commutativeHashMix(hash, elementHash);
  }
  return hash;
}

template <typename T>
uint64_t hashArray(
    const std::vector<T>& elements) {
  return hashArray(nullHash, elements);
}
```

上面通过一个单独的函数来实现，其实也可以直接写在 hasher 中。因为已经实现好的函数，所以 hasher 的实现就变成了对函数的简单包装。

```cpp
template <typename T>
struct hasher<std::vector<T>> {
  size_t operator()(const std::vector<T>& elements) const {
    return hashArray(elements);
  }
};
```


### Row

这里使用了变长参数模板的语法，通过遍历变长参数的数据，来进行 hash 的计算。

```cpp
template <typename T, typename... Args>
uint64_t hashRow(const T& t, const Args&... args) {
  uint64_t hash = nullHash;
  hash = hasher<T>{}(t);
  auto a = std::forward_as_tuple(args...);
  // 遍历后续的 args
  for_each(a, [&hash](auto x) {
    // decltype(x) 可以获取 x 的类型
    hash = hashMix(hash, hasher<decltype(x)>{}(x));
  });
  return hash;
}
```

上面的实现中，有一个特殊的函数 for_each，这个的实现也是比较有趣，是使用了模板的递归。

```cpp
// I == sizeof...(Tp) 就是遍历的终止条件
template <size_t I = 0, typename FuncT, typename... Tp>
inline typename std::enable_if_t<I == sizeof...(Tp)> for_each(
    std::tuple<Tp...>&,
    FuncT) {}

// std::enable_if_t< I < sizeof...(Tp) >
// 通过 I < sizeof...(Tp) 的条件来进行遍历
template <size_t I = 0, typename FuncT, typename... Tp>
    inline typename std::enable_if_t <I<sizeof...(Tp)> 
    for_each(std::tuple<Tp...>& t, FuncT f) {
  f(std::get<I>(t));
  // 递归调用，I + 1 进行下一个元素的迭代
  for_each<I + 1, FuncT, Tp...>(t, f);
}
```

# 结语

至此，我们就基本介绍了 hasher 的实现，对于非 hasher 相关的实现，如果不想暴露给用户，可以使用匿名 namespace 的方式来将其屏蔽，这样我们对外就可以暴露一个干净的 hasher 实现。


本文我们通过代码实例讲解了一些 C++ 模板的特性，有助于理解模板在实际项目中的使用方法，通过模仿来进行学习。

# 参考资料

1. [Velox: Meta’s Unified Execution Engine](https://research.facebook.com/publications/velox-metas-unified-execution-engine/)
2. [向量化执行引擎框架 Gluten 宣布正式开源，并亮相 Spark 技术峰会](https://cn.kyligence.io/blog/gluten-spark/)