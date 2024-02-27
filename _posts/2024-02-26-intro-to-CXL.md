---
layout: post
title: CXL（Compute Express Link）简介
category: 新硬件
tags: ['大数据', '新硬件', '计算引擎', 'CXL', 'Compute Express Link']
---

# CXL 是什么？

CXL 全称是 Compute Express Link，是一种在PCIe物理层上构建缓存一致性系统。CXL的概念最初由英特尔在2019年提出，旨在解决数据中心内存扩展和性能瓶颈问题。CXL旨在通过提供一种新的高速互连技术，使CPU、GPU、FPGA等处理器能够更高效地共享内存资源。

CXL 当前有多个版本：
1. CXL 1.0/1.1： CXL的首个版本（1.0/1.1）在2019年发布，它定义了CXL.io、CXL.cache和CXL.memory三种协议，支持不同类型的设备。CXL 1.0/1.1基于PCIe 5.0规范，提供了高带宽和低延迟的连接能力。
2. CXL 2.0： 在2020年，CXL 2.0规范发布，它在1.0/1.1的基础上增加了对机架级别资源池化的支持，引入了CXL交换机功能，允许在机架内构建网络，实现资源的解耦和池化。
3. CXL 3.0： 2022年，CXL 3.0规范发布，它建立在PCIe 6.0规范之上，将速率从32GT提升到了64GT，同时保持了低延迟。CXL 3.0还增加了对二层交换机的支持，支持更多的资源池化和网络拓扑。

随着CXL技术的推出，CXL联盟也随之成立，由英特尔牵头，包括阿里巴巴、戴尔EMC、Meta、谷歌、HPE、华为和微软等公司共同建立。联盟的目标是推动CXL技术的标准化和生态系统的发展。

# 应用

CXL 技术还是非常新的，目前应用还在探索中，这里的应用来自两篇论文：
* [TPP: Transparent Page Placement for CXL-Enabled Tiered-Memory](https://arxiv.org/pdf/2206.02878.pdf)
* [Pond: CXL-Based Memory Pooling Systems for Cloud Platforms](https://arxiv.org/pdf/2203.00241.pdf)

当前数据大爆炸的背景下，机房和公有云等场景的机房成本中很大的一部分是内存（Main Memory）。如何使用 CXL 的技术来更好地提升内存使用率，是 CXL 非常重要的一个探索方向。

## TPP

TPP 是 Meta 公司对于 CXL 使用的探索。这篇论文提出了 Transparent Page Placement 的一个方案，通过采样分辨内存中的 hot 和 cold page，TPP 可以将 cold page offload 到 CXL 内存上，从而在保证不影响性能的前提下，提升内存整体的利用率。

![memory lantency](/assets/blog/intro-to-cxl/TPP-fig-2.png)

CXL-memory 的速度介于 NVM(non-volatile memory) 与 Main Memory 之间，NVM 的代表技术就是 Intel PMem。


![Chameleon](/assets/blog/intro-to-cxl/TPP-fig-6.jpg)

这篇论文的主要面向的是 Meta 公司的数据中心，而非公有云的场景。如何区分 hot 和 cold page，本文提出了一个Chameleon的工具，是基于现代 CPU 的 PEBS 采样来分析内存使用情况。

TPP 这个方法对于应用程序来说是透明的，应用程序无需修改，TPP 的相关代码大部分合入到 Linux v5.18 内核中了。

## Pond

Pond 是 Microsoft Azure 关于 CXL 内存池化的方案，Pond 本质上是基于 CXL 的 memory pooling。

Microsoft Azure 的公有云规模比较大，成本上内存也是占了大头，所以希望提升内存的使用率，这个和 TPP 的背景基本类似。

根据其公有云上的 VM 使用情况进行分析，发现了两类内存浪费的情况：
* stranded memory：物理机的cpu cores已经被分配完了，但是内存仍然有剩余的情况，导致这部分内存无法被分配使用
* untouched memory：内存已经分配给 VM，但是 VM 并没有实际使用的内存，就是 VM 申请了更多的内存

![Pond](/assets/blog/intro-to-cxl/Pond-fig-11.png)

作为一个云厂商，需要在保证 VM 性能的前提下，尽可能利用起来上面两部分内存。Pond 这套方案包含两个预测模型，基本的逻辑如下：

1. 基于 CXL 的内存池，使用的内存是来自于 stranded memory。
2. 对于 VM 中的 untouched memory，替换为 CXL pool memory，其性能是不会受到影响的。memory offlining 速度比较慢，所以需要在 VM 创建的时候可以预测一个比较准确的 untouched memory 大小。
3. 对于一些 memory latency 不敏感的 workload，可以使用 CXL pool memory，这个时候其性能受到的影响也不大。核心就是如何判断 workload 是不是 memory lantency 敏感型的，Pond 的方法是通过一个机器学习的预测模型来做这个事情。
4. QoS Monitor 是一个兜底机制，会监控内存的性能，看是否满足 PDM（performance degradation margin，用来定义性能相较于 NUMA-local DRAM slowdown的比例），不满足 PDM 的话会进行 vm memory reconfiguration，将内存全部切换为 local memory，保证 VM 的性能。
5. 为了保证内存池的性能，使用的小池子，就是8-16 sockets共享一个 CXL 内存池。

# 参考资料

1. [CXL，新蓝海](https://36kr.com/p/2487688683116672)
2. [揭开CXL内存的神秘面纱](https://36kr.com/p/2210270994494850)
3. [一文了解高速互联技术CXL](https://www.sdnlab.com/26401.html)
4. [CXL(Compute Express Link) 简单概念梳理](https://zhuanlan.zhihu.com/p/629244470)
5. [CXL 深入探讨：可组合服务器架构和异构计算的未来](https://zhuanlan.zhihu.com/p/628518077)
6. [聊一聊CXL](https://zhuanlan.zhihu.com/p/466870704)
7. [TPP: Transparent Page Placement for CXL-Enabled Tiered-Memory](https://arxiv.org/pdf/2206.02878.pdf)
8. [Pond: CXL-Based Memory Pooling Systems for Cloud Platforms](https://arxiv.org/pdf/2203.00241.pdf)