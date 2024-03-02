---
layout: post
title: JVM 采集GC时的状态
category: 计算引擎
tags: ['大数据', 'Presto', '计算引擎']
---

# 概述

当前大数据组件是基于JVM开发的，例如Spark、Hadoop、Alluxio、Presto等。对于Spark这类单次执行一个Job后资源就释放的情况来说，JVM full gc 的影响只是单个Job，很多时候可以忽略。但是对于Presto这种长期运行的Worker来说，JVM full gc造成的影响会影响整个集群的所有查询，这种影响是无法忽略的。

目前计算引擎的趋势是走向基于C++开发，例如Databricks Photon、Meta Velox、Gluten等。使用native语言的好处就是拥有了更多的控制权，可以进行更加深入和定制地优化，可以更好地管理内存。

言归正传，对于目前大量存量的JVM系统来说，直接切换到C++是不现实的。所以，如何去分析JVM gc造成的原因，是Presto这类产品无法回避的一个问题。

本文就是分析了Presto社区的GcStatusMonitor，也根据自己的时间经验提出了一些思路。

# 采集的时机

其实对于分析问题来说，是需要有一个现场。但是很多时候我们发现gc类的问题，都是事后发现的，所以如何在事发时记录信息，让我们事后可以进行分析，选择时机很重要。

## GC发生时

Presto的[GcStatusMonitor](https://github.com/prestodb/presto/blob/6da49ceb313c4f21fa526df35c33d633801bf290/presto-main/src/main/java/com/facebook/presto/util/GcStatusMonitor.java)提供了一个不错的思路，这个类通过JMX的GarbageCollectorMXBean注册了一个回调函数，可以捕获GC事件，其中包含 full gc 和 young gc。在 full gc 的时候，记录了Presto Worker的Task数据。

部分核心逻辑代码：
```java
@PostConstruct
public void start()
{
    for (GarbageCollectorMXBean mbean : ManagementFactory.getGarbageCollectorMXBeans()) {
        if (mbean.getName().equals("TestingMBeanServer")) {
            continue;
        }

        // 对 gc 添加回调函数来获取gc事件
        ObjectName objectName = mbean.getObjectName();
        try {
            ManagementFactory.getPlatformMBeanServer().addNotificationListener(
                    objectName,
                    notificationListener,
                    null,
                    null);
        }
        catch (JMException e) {
            throw new RuntimeException("Unable to add GC listener", e);
        }
    }
}

private void onNotification(Notification notification)
{
    if (GC_NOTIFICATION_TYPE.equals(notification.getType())) {
        GarbageCollectionNotificationInfo info = new GarbageCollectionNotificationInfo((CompositeData) notification.getUserData());
        // full gc
        if (info.isMajorGc()) {
            onMajorGc();
        }

        // young gc 可以通过 info.isMinorGc() 来判断
        // 这里我们可以根据需要来添加
    }
}

private void onMajorGc()
{
    try {
        logActiveTasks();
    }
    catch (Throwable throwable) {
        log.error(throwable);
    }
}
```

## 内存使用超过阈值

Presto有MemoryPool对内存的使用进行统计，根据经验来说一般内存使用的量比较大之后，是比较容易导致慢，那么这个使用量可以作为一个经验阈值。当内存使用的量超过这个阈值的时候，对MemoryPool中的各个查询占用内存的情况进行一个记录，这个信息有助于进行进一步的分析。

# 采集的信息

对于Presto这种计算引擎来说，分析gc这类内存问题的时候需要先判断是哪个查询。所以我们把上述时机当时的查询和内存使用记录下来是非常有用的。

另外，有一个比较有用的信息就是线程的堆栈，分析是否有些线程比较异常。Alluxio就有通过JVM获取线程堆栈的代码[ThreadUtils::printThreadInfo](https://github.com/Alluxio/alluxio/blob/2617fc8dbbba10105fff3bc514f6f0ac46b01d96/core/common/src/main/java/alluxio/util/ThreadUtils.java#L126)，可以在这个代码基础上根据情况进行定制，对于Presto可以只获取Driver相关的线程堆栈。

# 总结

本文以Presto为例，对JVM gc分析采集的信息进行了简单的分析，结合自身经验提出了一些自己的思考。在GC发生、内存使用量超过阈值的时候，采集查询和内存使用量、线程堆栈信息。
