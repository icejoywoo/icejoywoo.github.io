---
layout: post
title: 使用 xsimd 进行简单的性能对比分析
category: xsimd
tags: ['xsimd', 'benchmark']
---

# 概述

随着硬件技术的发展，当前计算引擎的瓶颈已经从之前的IO（网络、存储等）重新变为了CPU，也就是计算的优化重新成为了当前发展的主流方向。其中，向量化计算引擎是近几年非常火热的发展方向，比较受人关注的是 Databricks 为 Spark 开发了基于 JNI 的 native engine -- Photon，使用了向量化来替代之前的 whole stage codegen。

如何向量化，笔者个人理解是大致有两类的：显示使用（explicit）和隐式使用（implicit）。explicit 就是直接使用 simd 指令来完成某些计算，implicit 是编译器会自动优化部分执行使用 simd 来执行。

本文是一个简单 xsimd 显示使用 simd 的示例，与非 simd 的代码进行 benchmark，笔者也是在探索中，难免有纰漏，欢迎指正。

本文包含两个测试：
* memset / memcpy 的测试：内存批量初始化的时候会使用，与标准库的实现进行对比，这类操作目前测试没有发现明显的性能优势，使用标准库的实现还是更加好的选择
* mean 计算的测试：向量化数值计算，对比内存 aligned 和 unaligned 的情况下性能差异，aligned内存的情况下性能很好

测试的机器配置为：ubuntu 20.04 (16 X 3500.16 MHz CPU s, 64GB mem)

# 性能测试

## memset / memcpy

这里测试使用的 simd 实现是从 velox 中的 [SimdUtil.h](https://github.com/facebookincubator/velox/blob/main/velox/common/base/SimdUtil.h) 拷贝过来的。

测试场景：
* simd::memset(BM_simd_memset) vs memset(BM_memset)
* simd::memcpy(BM_simd_memcpy) vs memcpy(BM_memcpy)

测试结果如下：

```
Run on (16 X 3500.16 MHz CPU s)
CPU Caches:
  L1 Data 32 KiB (x8)
  L1 Instruction 32 KiB (x8)
  L2 Unified 1024 KiB (x8)
  L3 Unified 36608 KiB (x1)
Load Average: 0.28, 0.25, 0.49
------------------------------------------------------------------------------
Benchmark                    Time             CPU   Iterations UserCounters...
------------------------------------------------------------------------------
BM_memset/8               2.32 ns         2.32 ns    301444533 bytes_per_second=3.21737G/s
BM_memset/64              2.02 ns         2.02 ns    345925867 bytes_per_second=29.4928G/s
BM_memset/512             6.07 ns         6.07 ns    115297974 bytes_per_second=78.5899G/s
BM_memset/4096            31.7 ns         31.7 ns     22393481 bytes_per_second=120.487G/s
BM_memset/8192            50.1 ns         50.1 ns     13246601 bytes_per_second=152.235G/s
BM_simd_memset/8          1.32 ns         1.32 ns    531374241 bytes_per_second=5.65612G/s
BM_simd_memset/64         1.15 ns         1.15 ns    607363914 bytes_per_second=51.6163G/s
BM_simd_memset/512        9.26 ns         9.26 ns     75479738 bytes_per_second=51.4947G/s
BM_simd_memset/4096       78.8 ns         78.8 ns      8875996 bytes_per_second=48.3829G/s
BM_simd_memset/8192        153 ns          153 ns      4574313 bytes_per_second=49.8905G/s
BM_memcpy/8               2.59 ns         2.59 ns    270251301 bytes_per_second=2.87618G/s
BM_memcpy/64              2.30 ns         2.30 ns    304065291 bytes_per_second=25.8889G/s
BM_memcpy/512             6.09 ns         6.09 ns    121525482 bytes_per_second=78.2633G/s
BM_memcpy/4096            46.9 ns         46.9 ns     14923118 bytes_per_second=81.2995G/s
BM_memcpy/8192             148 ns          148 ns      4350315 bytes_per_second=51.5552G/s
BM_simd_memcpy/8          2.88 ns         2.88 ns    243228448 bytes_per_second=2.58904G/s
BM_simd_memcpy/64         2.59 ns         2.59 ns    270123567 bytes_per_second=22.9938G/s
BM_simd_memcpy/512        12.7 ns         12.7 ns     55247214 bytes_per_second=37.6334G/s
BM_simd_memcpy/4096       98.4 ns         98.4 ns      7117486 bytes_per_second=38.778G/s
BM_simd_memcpy/8192        191 ns          191 ns      3672602 bytes_per_second=40.0315G/s
```

从上述的结果，我们可以看到在 bytes 小于512的时候，simd版本都存在一些优势，但是当 bytes 超过512之后，都是标准库的版本更好一些。

这里我们可以得到一个初步的结论，就是标准库版本的 memset 和 memcpy 本身的效率还是很不错，没必要使用 simd 版本，并且无法获得标准库新版本的优化。

测试代码：[xsimd_mem_bench.cpp](https://github.com/icejoywoo/modern-cpp-demo/blob/main/xsimd-demo/xsimd_mem_bench.cpp)

## mean 计算

计算两个 vector 的平均值，一个简单的计算逻辑，测试对比两个方面：
1. 普通的遍历计算方式与向量化的版本对比
2. 向量化的版本内存 aligned 和 unaligned 的对比

测试case：
1. BM_iterate_without_xsimd 直接遍历计算的计算方式，没有使用向量化
2. BM_unaligned 向量化的版本，但是内存为 unaligned（未使用 xsimd::aligned_allocator）
3. BM_aligned 向量化的版本，内存为 aligned（使用 xsimd::aligned_allocator）

测试结果：
```
Run on (16 X 3500.16 MHz CPU s)
CPU Caches:
  L1 Data 32 KiB (x8)
  L1 Instruction 32 KiB (x8)
  L2 Unified 1024 KiB (x8)
  L3 Unified 36608 KiB (x1)
Load Average: 0.13, 0.09, 0.24
----------------------------------------------------------------------------------------
Benchmark                              Time             CPU   Iterations UserCounters...
----------------------------------------------------------------------------------------
BM_unaligned/8                      3.45 ns         3.45 ns    202747658 bytes_per_second=2.15748G/s
BM_unaligned/64                     23.6 ns         23.6 ns     29632574 bytes_per_second=2.52343G/s
BM_unaligned/512                     231 ns          231 ns      3024851 bytes_per_second=2.06096G/s
BM_unaligned/4096                   1987 ns         1987 ns       352694 bytes_per_second=1.92021G/s
BM_unaligned/8192                   4742 ns         4742 ns       174593 bytes_per_second=1.60905G/s
BM_aligned/8                        2.59 ns         2.59 ns    270273350 bytes_per_second=2.87698G/s
BM_aligned/64                       11.7 ns         11.7 ns     60042960 bytes_per_second=5.11378G/s
BM_aligned/512                       116 ns          116 ns      6016284 bytes_per_second=4.09928G/s
BM_aligned/4096                     1491 ns         1491 ns       469625 bytes_per_second=2.55932G/s
BM_aligned/8192                     3114 ns         3114 ns       225573 bytes_per_second=2.45031G/s
BM_iterate_without_xsimd/8          2.53 ns         2.53 ns    276228202 bytes_per_second=2.93935G/s
BM_iterate_without_xsimd/64         17.0 ns         17.0 ns     41148206 bytes_per_second=3.50132G/s
BM_iterate_without_xsimd/512         164 ns          164 ns      4257083 bytes_per_second=2.89972G/s
BM_iterate_without_xsimd/4096       1811 ns         1811 ns       386507 bytes_per_second=2.10655G/s
BM_iterate_without_xsimd/8192       3617 ns         3617 ns       193562 bytes_per_second=2.10923G/s
```

从上述的测试结果，我们可以看到性能是 BM_aligned > BM_iterate_without_xsimd > BM_unaligned，从而我们可以获得两个简单的结论：
1. 默认不使用 simd 的情况下，也可以获得不错的性能，尤其是当计算非常简单，compiler 还是可以做到非常好的优化，compiler 会有向量化的[优化](https://godbolt.org/z/8h4qbGe17)
2. simd 的内存对齐 aligned 的情况下，性能会获得明显的提升

测试代码：[xsimd_aligned_bench.cpp](https://github.com/icejoywoo/modern-cpp-demo/blob/main/xsimd-demo/xsimd_aligned_bench.cpp)


# 总结

通过上面两个简单的测试，我们可以看出其实simd不一定就能带来提升，编译器本身升级新版本也会带来很多的性能提升，显示simd指令就无法获取这部分的提升了。

在使用 simd 的时候，还是不能为了使用而使用，盲目使用也并不一定能带来性能提升，需要进行比较细致的对比和分析。Photon 论文中提到目前 Photon 还是更多依赖了 compiler 的自动向量化。

# 参考资料

1. [Photon: A Fast Query Engine for Lakehouse Systems](https://cs.stanford.edu/~matei/papers/2022/sigmod_photon.pdf)
2. [xsimd](https://github.com/xtensor-stack/xsimd)
3. [godbolt](https://godbolt.org/)
4. [SSE/AVX加速时的内存对齐问题](https://xhy3054.github.io/memory-alignment/)
5. [从Eigen向量化谈内存对齐](https://zhuanlan.zhihu.com/p/93824687)
