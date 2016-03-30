---
layout: post
title: Hive 列存储简介
category: hive
tags: ['hive', 'ORC', 'Parquet']
---

# 背景

传统的 RDBMS 大多使用的行存储方式，现如今随着大数据技术的发展，对于存储的要求越来越高，列存储相对有自己明显的优势：列数据相对来说比较类似，压缩比更高；一般的查询只涉及几列，列存储的查询性能也更高；可以方便地新增列等。在某些场景下，选择列存储是非常不错的选择，从节省存储的角度来说就非常吸引人了。

目前，比较有名的开源实现有 [Apache Parquet](https://parquet.apache.org/) 和 [Apache ORC](https://orc.apache.org/)。ORC 官网介绍 Facebook 和 Yahoo 都使用了 ORC。

本文主要简单介绍两种列存储的使用，并且有一个简单的测试结果，测试主要看数据压缩比，简单查询的性能对比，仅供参考。

# Parquet

摘自参考 1 中的描述：

>Apache Parquet 最初的设计动机是存储嵌套式数据，比如Protocolbuffer，thrift，json等，将这类数据存储成列式格式，以方便对其高效压缩和编码，且使用更少的IO操作取出需要的数据，这也是Parquet相比于ORC的优势，它能够透明地将Protobuf和thrift类型的数据进行列式存储，在Protobuf和thrift被广泛使用的今天，与parquet进行集成，是一件非容易和自然的事情。 除了上述优势外，相比于ORC, Parquet没有太多其他可圈可点的地方，比如它不支持update操作（数据写成后不可修改），不支持ACID等。

# ORC

# 测试

存储压缩对比

简单的查询性能对比

# 参考

1. [大数据开源列式存储引擎Parquet和ORC](http://dongxicheng.org/mapreduce-nextgen/columnar-storage-parquet-and-orc/)
2. [Hive: LanguageManual ORC](https://cwiki.apache.org/confluence/display/Hive/LanguageManual+ORC)
3. [ORC Documentation](https://orc.apache.org/docs/)
4. [Parquet vs ORC vs ORC with Snappy](http://stackoverflow.com/questions/32373460/parquet-vs-orc-vs-orc-with-snappy)
5. [ORCFile in HDP 2: Better Compression, Better Performance](http://zh.hortonworks.com/blog/orcfile-in-hdp-2-better-compression-better-performance/)
