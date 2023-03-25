---
layout: post
title: Presto 的 pending 队列分析
category: Presto, 大数据
tags: ['大数据', 'Presto', '计算引擎']
---


# 简介

Presto 是一款通用计算引擎，由 Facebook 开发。Presto 由 Coordinator 和 Worker 两个部分组成，Worker 是执行 task 的节点，task 在执行过程中会拆分为 pipeline，会在 Driver 中执行。Driver 默认的执行逻辑是时间片轮转的方式，每当时间片消耗完，都会重新进入 pending 队列等待下次调度。

本文关注的就是 pending 队列的逻辑。整体上，Presto 的 pending 队列有两个实现：PriorityBlockingQueue 和 MultilevelSplitQueue，前者是 JDK 内置的 Queue，前期的实现方法，主要是修改了 compare 逻辑，后者是 Presto 自行实现的队列逻辑，是目前在使用的实现。

Presto 目前社区分裂为两个 [presto](https://github.com/prestodb/presto) 和 [trino](https://github.com/trinodb/trino)，本文使用的是 prestodb 的代码。

# PriorityBlockingQueue 实现

参考代码分支：0.165

同一个优先队列存放pending的任务，通过优先级和执行时间（时间越长优先级越低）两个来决定执行哪个任务。

整体思路是：

- 执行时间越长的查询就是慢查询，会调低其优先级，使得小查询可以更早获得调度执行
- 优先级分为 0 ～ 4，一共5个级别，最低是4，这里限制了最低是为了防止大查询一直降低优先级导致饿死
- PriorityBlockingQueue pendingSplits 优先队列，compareTo方法：比较优先级，优先级数字越小，优先级越高
   - 优先级 < 4：执行使用的时间越短优先级越高
   - 优先级 = 4：根据上次执行的时间，上次执行的时间越早优先级越高，FIFO


整体的思路：使用了优先级，执行的时间越长，优先级会降低，来保证小查询得到更早的执行

1. PrioritizedSplitRunner 包含了一个 priorityLevel 的参数，用来标记优先级
```java
@Override
public int compareTo(PrioritizedSplitRunner o)
{
    int level = priorityLevel.get();

    // 比较优先级大小
    int result = Integer.compare(level, o.priorityLevel.get());
    if (result != 0) {
        return result;
    }

    if (level < 4) {
        // 执行时间短的会优先执行
        result = Long.compare(taskScheduledNanos.get(), o.taskScheduledNanos.get());
    }
    else {
        // 最后一次执行ticker比较，保证 优先级为4的可以相对公平调度
        result = Long.compare(lastRun.get(), o.lastRun.get());
    }
    if (result != 0) {
        return result;
    }

    // workerId 是递增的，就是FIFO的顺序
    return Long.compare(workerId, o.workerId);
}
```

2. 每次 process 会统计执行消耗的时间，用这个时间来更新 priorityLevel
```java
priorityLevel.set(calculatePriorityLevel(taskScheduledTimeNanos));
```

3. alculatePriorityLevel 更新 priorityLevel，分为5个档位：0 ～ 4，根据执行的时间来进行划分
```java
public static int calculatePriorityLevel(long threadUsageNanos)
{
    long millis = NANOSECONDS.toMillis(threadUsageNanos);

    int priorityLevel;
    if (millis < 1000) {
        priorityLevel = 0;
    }
    else if (millis < 10_000) {
        priorityLevel = 1;
    }
    else if (millis < 60_000) {
        priorityLevel = 2;
    }
    else if (millis < 300_000) {
        priorityLevel = 3;
    }
    else {
        priorityLevel = 4;
    }
    return priorityLevel;
}
```


# MultilevelSplitQueue 实现

整体的调度策略是基于执行时间的公平调度（fair），不可以自行设置查询的优先级，查询的优先级是执行的过程中根据执行的时间动态调度，且每个优先级都有独立的优先队列。选择任务的时候，先选择优先级，再从对应的优先队列中拿取任务来执行。每个优先级预期可以执行的时间是通过level 0优先级的时间 和 levelTimeMultiplier 系数来一起决定的（优先级越低，执行时间越短）。

MultilevelSplitQueue waitingSplits 多级优先队列，优先级有0～4共5个优先级，每个优先级对应一个优先队列。

- waitingSplits.take() 获取任务
- waitingSplits.offer(split) 将未完成的split添加回队列

## 任务执行逻辑

TaskRunner 是执行的逻辑，其中最关键的就是 run 方法，关键部分增加了注释。
```java
@Override
public void run()
{
    try (SetThreadName runnerName = new SetThreadName("SplitRunner-%s", runnerId)) {
        while (!closed && !Thread.currentThread().isInterrupted()) {
            // select next worker
            final PrioritizedSplitRunner split;
            try {
                split = waitingSplits.take();
            }
            catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }

            String threadId = split.getTaskHandle().getTaskId() + "-" + split.getSplitId();
            try (SetThreadName splitName = new SetThreadName(threadId)) {
                RunningSplitInfo splitInfo = new RunningSplitInfo(ticker.read(), threadId, Thread.currentThread(), split);
                runningSplitInfos.add(splitInfo);
                runningSplits.add(split);

                ListenableFuture<?> blocked;
                try {
                    blocked = split.process();
                }
                finally {
                    runningSplitInfos.remove(splitInfo);
                    runningSplits.remove(split);
                }

                if (split.isFinished()) {
                    // 任务结束
                    log.debug("%s is finished", split.getInfo());
                    splitFinished(split);
                }
                else {
                    if (blocked.isDone()) {
                        // 没有 blocked 的直接添加回 waiting 队列
                        waitingSplits.offer(split);
                    }
                    else {
                        // 等待 blocked 结束再添加回 waiting 队列
                        blockedSplits.put(split, blocked);
                        blocked.addListener(() -> {
                            blockedSplits.remove(split);
                            // reset the level priority to prevent previously-blocked splits from starving existing splits
                            split.resetLevelPriority();
                            waitingSplits.offer(split);
                        }, executor);
                    }
                }
            }
            catch (Throwable t) {
                // ignore random errors due to driver thread interruption
                // ...
                splitFinished(split);
            }
        }
    }
    finally {
        // unless we have been closed, we need to replace this thread
        if (!closed) {
            addRunnerThread();
        }
    }
}
```
## MultilevelSplitQueue 的主要逻辑

MultilevelSplitQueue 重要成员变量：

- LEVEL_THRESHOLD_SECONDS = {0, 1, 10, 60, 300};
   - 新进来的split，优先级为0
   - computeLevel 根据这个数组计算优先级
- List<PriorityQueue<PrioritizedSplitRunner>> levelWaitingSplits：
   - list index 就是对应的优先级，目前优先级为1～4一共五个优先级
   - PriorityQueue 就是每个优先级对应的优先队列
- levelScheduledTime：
   - 每个优先级的执行时间（不会清零，下标对应的是优先级）
- levelMinPriority：
   - 每个优先级当前最低的 priority（take 的时候会更新）
- levelTimeMultiplier：默认为2
   - 优先级更高的level 会拥有比其低一级拥有 levelTimeMultiplier 倍的执行数据（例如：level 0 有 2倍的level 1 的执行时间）

MultilevelSplitQueue 关键的方法：

- offer(split)：添加 split 到队列中
   - 为了避免某个优先级队列为空的时候，导致其他优先级的队列饿死，所以会在添加split的时候进行补偿，将levelScheduledTime直接补偿到expected运行时间

```java
/**
 * During periods of time when a level has no waiting splits, it will not accumulate
 * scheduled time and will fall behind relative to other levels.
 * <p>
 * This can cause temporary starvation for other levels when splits do reach the
 * previously-empty level.
 * <p>
 * To prevent this we set the scheduled time for levels which were empty to the expected
 * scheduled time.
 */
public void offer(PrioritizedSplitRunner split)
{
    checkArgument(split != null, "split is null");

    split.setReady();
    int level = split.getPriority().getLevel();
    lock.lock();
    try {
        // 空的优先级队列会补偿其执行时间
        if (levelWaitingSplits.get(level).isEmpty()) {
            // Accesses to levelScheduledTime are not synchronized, so we have a data race
            // here - our level time math will be off. However, the staleness is bounded by
            // the fact that only running splits that complete during this computation
            // can update the level time. Therefore, this is benign.
            long level0Time = getLevel0TargetTime();
            long levelExpectedTime = (long) (level0Time / Math.pow(levelTimeMultiplier, level));
            long delta = levelExpectedTime - levelScheduledTime[level].get();
            levelScheduledTime[level].addAndGet(delta);
        }

        levelWaitingSplits.get(level).offer(split);
        notEmpty.signal();
    }
    finally {
        lock.unlock();
    }
}
```

- take：从多级队列中拿取一个split，用于执行
   - pollSplit 是选取ratio（预期执行时间 / 实际执行时间）> 1 的优先级，低优先级的会被先选到，因为从高到低遍历一次，然后从 levelWaitingSplits.get(selectedLevel).poll() 来获取

```java
/**
 * Presto attempts to give each level a target amount of scheduled time, which is configurable
 * using levelTimeMultiplier.
 * <p>
 * This function selects the level that has the the lowest ratio of actual to the target time
 * with the objective of minimizing deviation from the target scheduled time. From this level,
 * we pick the split with the lowest priority.
 */
@GuardedBy("lock")
private PrioritizedSplitRunner pollSplit()
{
    long targetScheduledTime = getLevel0TargetTime();
    double worstRatio = 1;
    int selectedLevel = -1;
    for (int level = 0; level < LEVEL_THRESHOLD_SECONDS.length; level++) {
        if (!levelWaitingSplits.get(level).isEmpty()) {
            long levelTime = levelScheduledTime[level].get();
            // ratio = 预期执行时间 / 实际执行时间
            double ratio = levelTime == 0 ? 0 : targetScheduledTime / (1.0 * levelTime);
            if (selectedLevel == -1 || ratio > worstRatio) {
                worstRatio = ratio;
                selectedLevel = level;
            }
        }

        targetScheduledTime /= levelTimeMultiplier;
    }

    // 队列中都没有split需要执行
    if (selectedLevel == -1) {
        return null;
    }

    PrioritizedSplitRunner result = levelWaitingSplits.get(selectedLevel).poll();
    checkState(result != null, "pollSplit cannot return null");

    return result;
}
```

- updatePriority 的逻辑：更新优先级的补偿机制
   - 优先级变更的时候会更新从低到高遍历所有优先级的 levelScheduledTime，将执行慢的查询的时间分给多个level
   - 因为如果一次性将长时间执行（LEVEL_CONTRIBUTION_CAP限制其大小）的时间一次性加到 某一个优先级，会导致一段时间内该优先级的任务被饿死

其他说明：

- split.resetLevelPriority()：在 TaskRunner.run 方法中，会在 blocked split 被唤醒后进行reset，主要是为了防止其优先级过高，导致其他队列中执行的split饿死

## TaskPriorityTracker

TaskPriorityTracker 包含了 updatePriority 和 resetLevelPriority 两个方法，优先级均在这个类进行更新，有两种策略：

- TASK_FAIR：优先级的粒度是 task 级别的
- QUERY_FAIR：优先级的粒度是 query 级别的

```java
// TaskExecutor 的构造函数中

Function<QueryId, TaskPriorityTracker> taskPriorityTrackerFactory;
switch (taskPriorityTracking) {
    case TASK_FAIR:
        taskPriorityTrackerFactory = (queryId) -> new TaskPriorityTracker(splitQueue);
        break;
    case QUERY_FAIR:
        LoadingCache<QueryId, TaskPriorityTracker> cache = CacheBuilder.newBuilder()
                .weakValues()
                .build(CacheLoader.from(queryId -> new TaskPriorityTracker(splitQueue)));
        taskPriorityTrackerFactory = cache::getUnchecked;
        break;
    default:
        throw new IllegalArgumentException("Unexpected taskPriorityTracking: " + taskPriorityTracking);
}
```

MultilevelSplitQueue 的主要实现 PR：
- [Change local scheduling to guarantee a time share to levels](https://github.com/prestodb/presto/commit/2395e964ce12aff1509f856895f1982d73101f7e)
- [Change local scheduling to be fair within a level](https://github.com/prestodb/presto/commit/d743fb014eeeca43549e36b6b8d4dea42ecddabd)

# 总结

MultilevelSplitQueue 整体来说会更加公平一些，并且这个调度策略其实和操作系统的调度策略有一些相似度的。MultilevelSplitQueue 都是通过一个执行时间的长度来进行调度，会更偏向于小作业，这样的调度策略有利于整体的吞吐。另外，对于时间上可以考虑添加 ratio 值，来对时间的快慢进行调整，执行时间变化得慢就越有机会拿到更多的执行时间，是可以基于该思路设计一套优先级策略的。


# 参考资料

1. [Presto实现原理和美团的使用实践](https://tech.meituan.com/2014/06/16/presto.html)
2. [惊闻Facebook开源大数据引擎Presto团队正在分裂](https://zhuanlan.zhihu.com/p/55628236)
3. [Presto multilevel splitqueue discussion](https://cdmana.com/2021/07/20210723120047408f.html)
4. [操作系统导论：多级反馈队列](https://zhuanlan.zhihu.com/p/367636084)

