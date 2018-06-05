---
layout: post
title: Spark 使用小结
category: spark
tags: ['spark', 'scala']
---

# 简介

本文主要介绍 Spark Application 和 Spark SQL 中比较常用的一些配置，一来方便个人检索和补充，二来希望可以帮到别人。

本文不求全，只求介绍部分个人使用过程中学习到的经验和方法，本文主要以 Spark 2.1 为例，Spark 目前发展还很快，本文中的一些方法可能很快就不适用了。

额外说明一下本文所指的 Spark Application 和 Spark SQL：

1. Spark Application 指使用 Scala、Java 或 Python 等编写的，用代码方式来进行配置和计算的，代码中也可以使用 SQL，或者类 SQL API。
2. Spark SQL 单指 spark-sql 启动的命令行，与 hive 兼容的方式使用，全部使用 SQL 来配置和查询计算。

# 基本配置

启动 spark 的时候，需要配置的基本参数：

1. --master 指定运行方式，默认本机执行，支持多种方式：本机执行使用 local[n]，其中 n 为线程数；yarn 在 yarn 集群上执行；spark://x.x.x.x:7077 是 standalone cluster 模式
2. --deploy-mode 支持 cluster 和 client 两种模式，默认 client，
3. --num-executors 指定总 executor 个数
4. --executor-memory executor 内存大小，需要根据不同的任务进行配置，配置过低的话，会导致 OOM 错误
5. --executor-cores 指定单个 executor 使用的核数，即开多少线程来并发执行 task
6. --driver-memory 配置 driver 的内存大小，driver 内存在需要获取结果比较大的时候需要额外调整，否则会 OOM

配置部分详情可以参考[官网配置文档](https://spark.apache.org/docs/latest/configuration.html)。

# 控制结果文件数

结果文件数的个数大致与 task 个数相当，经常出现一种情况，就是单个文件很小，文件数目很多的情况，这种需要合并结果文件。

目前需要预估整体的大小，单个文件不易过大，否则可能导致 executor 在写入结果的时候出现 OOM 等情况，与具体的输出格式等有关。根据经验来说，单个文件控制在 HDFS block 大小比较合适，再次读取的性能一般会好一些，应该注意避免文件过小数目过多。

在代码中可以通过 RDD 的两个方法来实现：repartition 和 coalesce。其中，repartition 只是 coalesce 接口中 shuffle 为 true 的版本，尽量使用 coalesce，因为没有 shuffle 的时候，整体性能会更好一些。coalesce 只能减少 partition 数量，不能增多，这种情况下必须使用 repartition。

Spark SQL 中可以通过下面两个配置来实现结果文件数的控制，下面

```sql
set spark.sql.output.merge=true;
set spark.sql.output.coalesceNum=<结果文件数>;
```

# 启用 off-heap 内存

开启 off-heap 的好处，在需要内存中缓存大量数据的时候，off-heap 的内存使用更少效率更高，同时不会引起频繁的 GC，内存完全独立控制。所以，在需要缓存大数据量的时候，能一定程度上提升性能。

主要配置：

1. spark.memory.offHeap.enabled 启用 off-heap 内存
2. spark.memory.offHeap.size 单位 bytes，配置不要超过单个 executor 的内存

off-heap 内存源自 tungsten 项目，一个致力于压榨现代服务器性能的项目，为 spark 提速做出了巨大贡献。

tungsten 相关资料：

1. [Project Tungsten: Bringing Apache Spark Closer to Bare Metal](https://databricks.com/blog/2015/04/28/project-tungsten-bringing-spark-closer-to-bare-metal.html)
2. [Deep Dive into Project Tungsten: Bringing Spark Closer to Bare Metal](https://databricks.com/session/deep-dive-into-project-tungsten-bringing-spark-closer-to-bare-metal)

# 结束语

目前只汇总了比较简单的一些配置，Spark 还在快速发展中，本文的配置不一定在将来还适用，使用过程中还需多自行验证效果。
