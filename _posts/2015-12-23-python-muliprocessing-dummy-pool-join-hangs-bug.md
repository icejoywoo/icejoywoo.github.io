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

本文讨论的 bug 都是 2.7.3 的，因为项目环境目前都依赖 2.7.3，暂时无法全部升级，在当前 2.7.x 分支的新版中，bug 都已经修复。版本间的 bug，相对比较难调适，可能本地开发都没问题，上线就出问题了，环境问题也是个大问题。

# Bug: pool.map hangs on empty list

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

# Bug: craches when spawn pool in non-main thread

如果在非主线程中初始化 Pool，就会碰到下面这种异常：

```
Traceback (most recent call last):
  File "/path/to/python/lib/python2.7/multiprocessing/process.py", line 258, in _bootstrap
    self.run()
  File "/path/to/python/lib/python2.7/multiprocessing/process.py", line 114, in run
    self._target(*self._args, **self._kwargs)
  File "/path/to/my/code.py", line x, in __init__
    self._pool = multiprocessing.dummy.Pool(concurrency)
  File "/path/to/python/lib/python2.7/multiprocessing/dummy/__init__.py", line 150, in Pool
    return ThreadPool(processes, initializer, initargs)
  File "/path/to/python/lib/python2.7/multiprocessing/pool.py", line 685, in __init__
    Pool.__init__(self, processes, initializer, initargs)
  File "/path/to/python/lib/python2.7/multiprocessing/pool.py", line 136, in __init__
    self._repopulate_pool()
  File "/path/to/python/lib/python2.7/multiprocessing/pool.py", line 199, in _repopulate_pool
    w.start()
  File "/path/to/python/lib/python2.7/multiprocessing/dummy/__init__.py", line 73, in start
    self._parent._children[self] = None
AttributeError: 'Thread' object has no attribute '_children'
```

Bug 复现代码也比较简单，在主线程初始化一切正常，在非主线程中初始化会导致异常。

```python
from multiprocessing.dummy import Pool
import threading
import weakref

class T(threading.Thread):
    def run(self):
        p = Pool(4)

t = T()
t.start()
t.join()
```

主线程没有问题的原因是因为在 multiprocessing/dummy/\_\_init\_\_.py 代码中有对主线程做了特殊处理，增加了 \_children 属性。

```python
# multiprocessing/dummy/__init__.py line: 96
current_process = threading.current_thread
current_process()._children = weakref.WeakKeyDictionary()
```

这个问题同样是在 2.7.3 版本中存在，在 2.7.10 版本已经修复。

修复方式同样是两种：一种升级 Python 版本到 2.7 的最新版本；另一种就是为 current_thread 添加一个 \_children 属性。

```python
from multiprocessing.dummy import Pool
import threading
import weakref

class T(threading.Thread):
    def run(self):
        # fix crash issue14881
        threading.current_thread()._children = weakref.WeakKeyDictionary()
        p = Pool(4)

t = T()
t.start()
t.join()
```

# 参考资料

1. [Issue6433: multiprocessing: pool.map hangs on empty list](https://bugs.python.org/issue6433)
2. [Issue25656: multiprocessing.dummy: pool.map hangs on empty list](https://bugs.python.org/issue25656)
3. [Issue14881: multiprocessing.dummy craches when self._parent._children does not exist](https://bugs.python.org/issue14881)
