---
layout: post
title: Hadoop Short Circuit 本地读优化
category: hadoop
tags: ['hadoop', 'short circuit']
---

一种通过 unix domain socket 来传递文件描述符fd，通过 data node 打开文件，传递给 DFSClient 来进行读取。

原本可以通过直接读取文件来实现，但是拥有权限问题，改为了通过 unix domain socket 的方式。

HDFS-2246
HDFS-347

Apache Hadoop 2.6.0-cdh5.13.0
Apache Hadoop 3.0.0-beta1


https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ShortCircuitLocalReads.html
https://archive.cloudera.com/cdh5/cdh/5/hadoop/hadoop-project-dist/hadoop-hdfs/ShortCircuitLocalReads.html
http://blog.cloudera.com/blog/2013/08/how-improved-short-circuit-local-reads-bring-better-performance-and-security-to-hadoop/


Linux 的 direct io
http://www.lenky.info/archives/2012/05/1660
