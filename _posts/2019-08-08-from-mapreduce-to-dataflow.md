---
layout: post
title: 从 MapReduce 到 Dataflow 看大数据发展趋势
category: bigdata
tags: ['bigdata', 'mapreduce', 'millwheel', 'flumeJava', 'dataflow']
---

## 正文

转眼已经工作了6年多了，一直从事大数据相关的工作，对整个大数据发展的趋势有个人比较浅显的理解。本文主要从Google的几篇论文来简单看一下这些年大数据的发展历程，梳理一下技术发展的脉络。

Google是最早提出大数据概念，并且横空出世了三驾马车（MapReduce、GFS、BigTable），MapReduce至今仍然是承载着非常大量的计算，直接导致了Hadoop开源生态的繁荣。MapReduce的计算模型太过简单，编写复杂程序的时候，会进行多轮计算，对程序员的要求比较高，需要进行大量的手动优化。为了简化编程模型，又出现了FlumeJava（注意不是 Apache Flume），一个对MapReduce计算模型的改进，提供了更高级的数据结构与操作的封装，可以专注业务逻辑，通过执行计划的优化缩减计算轮次，可以做到与手工优化几乎一样的效果。这个对后来的Spark等都有非常大的启发作用。

大数据的批量数据的问题基本解决了，但是大家对于时效性又提出了更高的要求，于是又出现了Millwheel，一个低延时容错的流式计算引擎，区分了event time和processing time，还可以使用系统接收到数据的injection time，根据time使用low watermark来估算当前数据进度。对于有状态的计算，可以采用窗口计算的方式，可以支持固定、滑动和session窗口，提供了灵活的编程模型支持。

流式计算的发展，大家逐渐意识到了批量与流式计算之间的关系，流式计算的模型是可以完全覆盖批量计算的，也就是说批量计算只是流式计算的一个特例。在此背景下，dataflow编程模型出现了，这个是建立在FlumeJava和Millwheel基础之上的，计算模型的关键在于可以根据需求对准确性和时效性进行取舍，同一套代码可以在批量与流式上运行。在此之前，最著名的方案就是批量与流式各建设一条流，批量关注准确性，流式关注时效性，结果数据融合两者，可以获得时效性与准确性的平衡，数据最终会被批量的准确数据取代，这个就是著名的lambda架构，最初由Storm的作者提出，可以阅读参考文献5，这个模型最大的痛点就是建设批量与流式两条数据流的成本非常大，后续维护升级难度高。而dataflow统一了二者，并且提供了更为丰富的语义，当前Spark和Flink都有流批统一的趋势，dataflow目前也有对应的开源项目Apache Beam，并且支持多种执行引擎，包括Spark和Flink，还有Google自家的。

## 总结

这么些年来，大数据的计算模型一直在不断眼花，从批量计算到流式计算，再到流批统一，但是目前大数据的存储部分变化仍然不是特别大，开源仍然是以HDFS为主，也有各类公司自研的，基本还是GFS的样子。随着计算模型的不断优化迭代，当前的存储很多时候成为了大数据计算的瓶颈，后续我们很可能会迎来存储的大变革，非常期待后续大数据的发展。

## 参考文献

1. [MapReduce: Simplified Data Processing on Large Clusters](https://static.googleusercontent.com/media/research.google.com/zh-CN//archive/mapreduce-osdi04.pdf)
2. [FlumeJava: Easy, Efficient Data-Parallel Pipelines](https://storage.googleapis.com/pub-tools-public-publication-data/pdf/35650.pdf)
3. [MillWheel: Fault-Tolerant Stream Processing at Internet Scale](https://static.googleusercontent.com/media/research.google.com/zh-CN//pubs/archive/41378.pdf)
4. [The Dataflow Model: A Practical Approach to Balancing Correctness, Latency, and Cost in Massive-Scale, Unbounded, Out-of-Order Data Processing](https://www.vldb.org/pvldb/vol8/p1792-Akidau.pdf)
5. [How to beat the CAP theorem](http://nathanmarz.com/blog/how-to-beat-the-cap-theorem.html)
