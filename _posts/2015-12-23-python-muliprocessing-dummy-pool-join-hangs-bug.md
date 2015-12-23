---
layout: post
title: Python multiprocessing.dummy.Pool hangs 的 Bug 及其修复方法
category: python
tags: ['python', 'multiprocessing.dummy', 'bug']
---

Python 内置了一个线程池的实现，隐藏在 multiprocessing.dummy 这个包中。

对于这个包，官方文档只有这么一句话：

>multiprocessing.dummy replicates the API of multiprocessing but is no more than a wrapper around the threading module.

dummy 提供了一套 threading 的 wrapper，这样就可以替换 Process 的实现，来让 multiprocessing 中的各种工具类变成使用线程的了。

内置的线程池还是非常方便的，在使用过程中，在处理一个空的 iterable 的时候，发现程序会 hang 死在 pool.join 的地方。

测试代码如下：

```python
from multiprocessing.dummy import Pool

p = Pool()

a = []

def f(x):
    pass

p.map(f, a)

p.close()
p.join()  # hang here
```

出现此问题的 Python 版本为：2.7.3，在 2.7.10 版本运行同样的代码没有发现问题。应该在新版已经修复。

问题的修复方法也很简单，有两种：一种就是继续使用 2.7.3，在 map 之前判断 iterable 是否为空即可；另一种就是升级到已经修复了这个问题的 Python 版本。

# 参考资料

1. [multiprocessing.dummy: pool.map hangs on empty list](https://bugs.python.org/issue25656)
