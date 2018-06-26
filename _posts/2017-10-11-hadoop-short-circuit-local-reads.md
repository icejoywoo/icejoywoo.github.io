---
layout: post
title: Hadoop Short Circuit 本地读优化
category: hadoop
tags: ['hadoop', 'short circuit']
---

Hadoop 的设计原则中有一条，移动计算比移动数据容易，移动计算只需要将代码发送到某台机器即可，而数据移动需要耗费带宽，拷贝耗时较大，行程慢节点，会极大地拖慢整体的计算。

在 Hadoop 的 MapReduce 计算中，会存在数据和计算都在机器节点的情况，这个时候读取也要使用 DFSClient 通过网络协议来读取，这样无疑对系统造成了额外的负担，是否可以在这种情况，让计算直接去读取数据，无需通过网络，这就是 Hadoop 的本地读优化的基本思路。

最直接的思路就是，就是 DFSClient 直接去读取本地的文件，这样就不经过网络了，达到了优化的目的，具体参考 [HDFS-2246](https://issues.apache.org/jira/browse/HDFS-2246)。

直接读取本地文件的方法，会存在安全问题，有权限读取本地文件的用户可以读取节点上的任意文件。后来，为了改进这个安全问题，出现了 [HDFS-347](https://issues.apache.org/jira/browse/HDFS-347)，基本思路是借用了 unix domain socket 可以传递 file descriptor 的方法，在 DataNode 上打开相应的文件，传递 fd 到 DFSClient 上，用户计算可以读取到数据，但是无法访问节点上的任意文件，通过这种方式限制了读取的文件范围，更加安全。

Python 进程间通过 unix domain socket 传递 file descriptor 的例子：[Demonstration of sharing file descriptors across processes](https://gist.github.com/bdarnell/1073945)

# 参考资料

1. [HDFS Short-Circuit Local Reads](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ShortCircuitLocalReads.html)
2. [How Improved Short-Circuit Local Reads Bring Better Performance and Security to Hadoop](http://blog.cloudera.com/blog/2013/08/how-improved-short-circuit-local-reads-bring-better-performance-and-security-to-hadoop/)
