---
layout: post
title: Remote Shuffle Service 概述
category: shuffle
tags: ['大数据', 'shuffle']
---

# 概述

**Shuffle** 是大数据处理中非常重要的一个操作，其作用是将数据按照新的分区方式进行重新分布，从而满足计算上对分区的要求，保证最终结果的正确性。一般来说，聚合（aggregation）、join 等都需要 Shuffle 操作。Shuffle 整体上可以分为 **Shuffle 写**和 **Shuffle 读**两个阶段。在分布式计算中，Shuffle 的稳定性和性能都是十分重要的。

随着硬件的不断更新换代，网络速度有了非常大的提升，而 CPU、内存、磁盘等提升却相对有限，这个硬件发展的趋势是 Shuffle Service 这种架构所能诞生的关键因素。因为在传统的分布式优化思路中，通常希望的是移动计算，而非移动数据。但是随着网络硬件的快速发展，网络的速度相较于机械硬盘来说已经不慢了，甚至更快了。那么，移动数据就变得可以接受了，这就为将 Shuffle 数据写入到远端的存储上提供了可能性。

Shuffle Service 的架构上存在一定的权衡。例如 Spark 的 Shuffle 数据很多实现都是写入本地盘的。如果将其修改为写入到远端存储中，就可以在远端存储中，将原来的 mapper 产生的数据根据分区来进行 merge，这样 reducer 来拉取的时候就可以从原来的随机读变为顺序读，提升了 shuffle 读的效率。但是相较于直接写入本地盘，shuffle 写多了**写入远端存储**和**数据 merge 操作**，这些会有额外的开销。Shuffle Service 需要在其中进行权衡。

Shuffle Service，有时候也称为 Remote Shuffle Service（缩写 RSS），本文简单介绍下 Shuffle Service 的一些实现。

笔者发现了几点共同点：
* 从 2018 年之后，Shuffle Service 逐渐有大公司开始实现，几乎都是针对 Spark 在大规模应用场景下的优化，并且取得了不错的 E2E 性能收益
* 从 2020 年开始，逐步有多个 Shuffle Service 的项目开源，例如 Apache Celeborn、Apache Uniffle 等
* Shuffle Service 整体的逻辑上没有太大的变化，所以学习一些历史上的系统，对于理解 Shuffle Service 会非常有帮助

本文挑选了几个比较典型的 Shuffle Service 系统来进行简单的介绍。


# Sailfish（2012）

Sailfish 是2012年提出的，是 Remote Shuffle Service 早期的探索。

针对 Hadoop MapReduce 任务设计的，提出了基于 KFS 实现的 I-file，其特点是可以多个 writer 同时写入数据，也就是 shuffle 过程中，多个 mapper 将相同分区的数据写入到一个 I-file 文件中，通过这样的方式，完成了多个 mapper 相同分区数据的聚合，在 shuffle 读的过程中，只需要读取一个 I-file 即可。这样就把 shuffle 的随机读变为了顺序读。

Sailfish 中基于文件系统进行设计的 I-file 还是可以给我们很多启发的，同时对于 shuffle 写有了一个比较好的抽象：一个支持多个 writer 同时写入的文件。

## 相关资料

* [Sailfish: a framework for large scale data processing](https://dl.acm.org/doi/10.1145/2391229.2391233)
* [Google Code 项目主页](https://code.google.com/archive/p/sailfish/)
* [项目网站](https://sites.google.com/site/lishmacsailfish/home)：整体介绍、设计等相关文档

# Riffle（2018）

Riffle 是 facebook 的 shuffle service 实现，针对 Spark 设计的，属于一个常驻服务，部署方式与 Spark ESS 一致。

Riffle 有两种部署方式：与 Spark ESS 一样，只会 merge 单个节点上的 mapper 分区数据；存储计算分离（disaggregated architecture）的架构下，单独部署，这样会把所有 mapper 的数据都进行 merge。

Riffle 的 merge 过程是一个异步的过程，mapper 默认数据还是写入到本地，然后异步地进行 merge。

另外，提出了 Best-effort merge 的概念，可以混合处理 merge 和 unmerge，merge 的过程是一个可选的，这样可以减少长尾 merge 对整体 RT 的影响。

## 相关资料

* [Riffle: Optimized Shuffle Service for Large-Scale Data Analytics](https://www.cs.princeton.edu/~mfreed/docs/riffle-eurosys18.pdf)
* [Riffle slides](https://haoyuzhang.org/publications/riffle-eurosys18-slides.pdf)
* [SOS: Optimizing Shuffle I/O](https://databricks.com/session/sos-optimizing-shuffle-i-o)

# Cosco（2019）

Cosco 也是 facebook 的 shuffle service 实现，应该是 Riffle 的继任者。

Cosco 提到可以支持 Spark 和 Hive，算是朝着通用的 Shuffle Service 去演进。

在 Shuffle 写的阶段，支持了排序，如果有需要的话，可以进行排序，这样就支持了 sort shuffle 的形式。

引入 write-ahead buffer，来对写进行优化，后续还使用Flash（SSD）来替换内存（DRAM）来进行缓存，以获取更大容量的 buffer，虽然 Flash 的速度慢一些，但是是在可接受的范围内。

## 相关资料

* [Cosco: An Efficient Facebook-Scale Shuffle Service](https://databricks.com/session/cosco-an-efficient-facebook-scale-shuffle-service)
* [Flash for Apache Spark Shuffle with Cosco](https://databricks.com/session_na20/flash-for-apache-spark-shuffle-with-cosco)

# Magnet（2020）

Magnet 是 Linkedin 针对 Spark 大规模场景下设计的 Shuffle Service。Magnet 不支持排序，部署方式与 Spark ESS 一样，shuffle 数据的元信息保存在 Spark Driver 中，与 Spark 耦合。

Magnet 也有 best-effort approach，与 Riffle 类似，就是 merge 和 unmerged 数据都可以使用，针对长尾节点或者数据倾斜的情况，reducer 直接拉取 unmerged 文件。

## 相关资料

* [Magnet: Push-based Shuffle Service for Large-scale Data Processing](http://www.vldb.org/pvldb/vol13/p3382-shen.pdf)
* [Tackling Scaling Challenges of Apache Spark at LinkedIn](https://databricks.com/session_na20/tackling-scaling-challenges-of-apache-spark-at-linkedin)
* [Linkedin Magnet](https://engineering.linkedin.com/blog/2020/introducing-magnet)

# 总结

近几年，有很多开源的 Shuffle Service，虽然部分项目会声明为通用的 Remote Shuffle Service，但是基本上都是针对 Spark 来落地的。

Shuffle Service 目前来说对于大规模场景下才能有比较好的收益，收益主要体现在两方面：稳定性，E2E性能提升。Shuffle Service 是在远端保存 shuffle 数据，这样计算节点挂掉不会影响 shuffle 数据的读取，可以简化容错的处理。

Shuffle Service 目前来说整体的思路上没有太大的变化，但是目前这类的实现都有一些各自的取舍，在工程上为了性能等原因很难做到非常通用，都需要针对不同的系统进行特定的设计。如何设计通用的 Shuffle Service 还是一个很有挑战的事情。

Shuffle Service 是近几年值得持续关注的一个方向，这里设计的一些变化，都体现了硬件的发展对于软件系统设计的影响，这也告诉我们需要多多关注新硬件。

# 参考资料

1. [业界RemoteShuffleService实现汇总](https://zhuanlan.zhihu.com/p/462338206)
2. [Sailfish](https://code.google.com/archive/p/sailfish/)
3. [Facebook Cosco](https://www.databricks.com/session/cosco-an-efficient-facebook-scale-shuffle-service)
4. [Linkedin Magnet](https://engineering.linkedin.com/blog/2020/introducing-magnet)
5. [Uber Zeus](https://www.databricks.com/session_na20/zeus-ubers-highly-scalable-and-distributed-shuffle-as-a-service)
6. [Apache Celeborn](https://github.com/apache/incubator-celeborn)
7. [Spark+Celeborn：更快，更稳，更弹性](https://zhuanlan.zhihu.com/p/604575649)
8. [Apache Uiffle](https://github.com/apache/incubator-uniffle)
9. [齐赫-Apache Uniffle (Incubating) : 打造新一代通用Shuffle系统](https://www.slidestalk.com/slidestalk/6Uniffle32864?video)