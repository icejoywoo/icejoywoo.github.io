---
layout: post
title: Python 的 list 和 dict 的遍历方式
category: python
tags: ['python']
---

# 概述

Python 中的 list 和 dict 是非常常用的数据结构，但是因为我们大多数人的第一门语言都是 C++ 或 Java，在使用 Python 的过程中，会套用之前语言的思维，而不是 Pythonic 的方式。本文提供一些使用建议，希望可以帮助大家写出更 pythonic 的代码。

# list 遍历

list 的遍历非常简单，直接通过 for 即可。

```python
a = ["a", "b", "c", "d"]

for i in a:
    # do something with i
    print i
```

当遍历需要拿到当前的 index 时，很多人会这样写。

```python
a = ["a", "b", "c", "d"]

for i in range(len(a)):
    # do something with i
    print i, a[i]
```

需要注意这里的 range 在 2.7 版本里面是会一次性生成一个 list，如果 list 长度很长的话，这里会卡住较久，有性能问题，推荐改为 xrange。在 3.x 版本里面 range 的实现已经和 2.x 里面的 xrange 一致了。

上述的代码看起来会有点意图不明确，而且略显啰嗦。其实 Python 提供了一个 enumerate 方法来处理这种情况。

```python
a = ["a", "b", "c", "d"]

for i, el in enumerate(a):
    # do something with i & el
    print i, el
```

enumerate 还有第二个参数 start，是从 2.6 版本开始加入的，我们看下文档的定义。

> enumerate(iterable[, start]) -> iterator for index, value of iterable

我们可以很方便的选择起始的 index，如果用 range 实现会蹩脚很多。

```python
a = ["a", "b", "c", "d"]

# 从 1 开始遍历
for i, el in enumerate(a, 1):
    # do something with i & el
    print i, el
```

# dict 遍历

遍历 dict 也可以使用 for，这样可以拿到 dict 的 key。

```python
d = {'a': 1, 'c': 3, 'b': 2, 'd': 4}

for k in d:
    print k

for k in d:
    print k, d[k]
```

用 for 遍历需要拿到 value 的时候会需要额外访问一次，可以一次性拿到 key 和 value 么？当然是可以的，dict 提供了多种方法选择。

```python
d = {'a': 1, 'c': 3, 'b': 2, 'd': 4}

for k, v in d.items():
    print k, v
```

需要注意的是 items 是一次性返回了所有的 key value，会有和 range 一样的问题，所以 dict 还提供了一个 iteritems 方法，遍历效率更高。

此外，dict 还包含了 keys、values 对应的方法，用起来与 items 是一样的。

需要注意的是 dict 是不保证加入顺序的。如果需要保证顺序，请使用 collections.OrderedDict。

# 总结

通过使用 python 提供给我们的方法，我们可以写出更加简洁并且意图更清晰的代码。