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

Spark 任务中的最高并发的 task 数量为 num-executors * executor-cores。

配置部分详情可以参考[官网配置文档](https://spark.apache.org/docs/latest/configuration.html)。

## 终端中文乱码问题

在 Spark Shell 中调试代码，可能会输入中文，但是会出现乱码情况，需要对字符编码进行申明才可以。

```bash
spark-shell ... --driver-java-options "-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8"
```

## 日志配置

在 Spark Shell 中调试代码，会碰到日志过多的情况，可以通过 log4j 来进行设置。

```scala
import org.apache.log4j.Logger
import org.apache.log4j.Level
Logger.getLogger("org").setLevel(Level.WARN)
Logger.getLogger("akka").setLevel(Level.WARN)
```

# shuffle 参数

在 Spark SQL 中，shuffle partition 的数量可以通过 spark.sql.shuffle.partitions 来配置，默认为 200。

shuffle partition 数量过小的话，会导致单个 reduce task 的处理数据量增多，内存大小有限的情况下，会溢写（spill）到磁盘上，从而影响 SQL 的整体性能，并且可能产生比较严重的 GC 问题或者 OOM；shuffle partition 数量过大的话，会导致 reduce task 每个执行时间很短，任务调度的负担比较大，上游的 mapper task 切分的 hash bucket 数据量小，导致拉取数据的时候频繁的小数据量读写，磁盘 IO 性能比较差，从而影响了 SQL 整体的性能。

实践中，需要实际测试来选取一个合适的 shuffle partition 大小，shuff partition 参数是在 spark 任务中所有的 stage 都生效的，所以这个参数的调节会需要进行较多的权衡。

如果上游数据量波动不是特别大的话，可以考虑通过配置 off-heap 来缓解内存问题，有限内存下可以保存更多的数据，而且性能会更高一些；如果数据量波动过大的话，目前这块没有特别好的解决方法。

# 控制结果文件数

在 Spark SQL 中，结果文件数的个数大致与 task 个数相当，经常出现一种情况，就是单个文件很小，文件数目很多的情况，这种需要合并结果文件。

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

# 预测执行

有时候预测执行会产生大量的任务，并且会导致任务大量失败，可以考虑尝试关闭预测执行。可以通过 spark.speculation 设置为 true 或 false 来开启或关闭预测执行。

# 结束语

目前只汇总了比较简单的一些配置，Spark 还在快速发展中，本文的配置不一定在将来还适用，使用过程中还需多自行验证效果。
