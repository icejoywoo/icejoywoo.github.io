---
layout: post
title: Python 的 unhashable type 错误分析及解决
category: python
tags: ['python', 'TypeError']
---

本文是笔者重写了旧博客中的[python使用set来去重碰到TypeError: unhashable type](https://www.cnblogs.com/icejoywoo/p/3426310.html)，并增加了一些更为深入的内容。

# 概述

我们在 Python 日常使用和开发中，经常会使用 set 和 dict，set 是用 dict 来实现，因为本身 dict 的 key 就是会被去重的，value 设置为 None 即可作为 set 使用。

Python 中的 dict 内部使用了哈希表的方式实现，所以对于 key 的要求就是需要计算哈希值。在 Python 的类型体系中，有些类型是支持计算哈希值，有些并不支持。所以我们可以知道，使用不支持计算哈希值的类型作为 dict 或 set 的 key 就会报错。

# 错误举例

下面简单举例，来说明引起错误的情况。

```python
# list 作为 dict 的 key
key = ["news", "hot"]
news = {}
news[key] = ["news_1", "news_2"]
# TypeError: unhashable type: 'list'

# list 作为 set 的 key 来去重
categories = [["news", "hot"], ["sports", "nba"]]
categories = set(categories)
# TypeError: unhashable type: 'list'
```

# 深入分析

我们现在知道了这个错误的原因，那么 Python 内置类型中哪些支持哈希计算，哪些不支持了。

下面我们测试一下 Python 内置的类型。

```python
import sys


def check_hash(x):
    if x.__hash__ is not None:
        print type(x), 'hashable:', hash(x)
        return True
    else:
        print type(x), 'unhashable'
        return False

# int
i = 5
check_hash(i)
# long
l = sys.maxint + 1
check_hash(l)
# float
f = 0.5
check_hash(f)
# string
s = "hello"
check_hash(s)
# unicode
u = u"中国"
check_hash(u)
# tuple
t = (i, l, f, s, u)
check_hash(t)
# object
o = object()
check_hash(o)

# list
l1 = [i, l, f, s, u]
check_hash(l1)
# set
s1 = {i, l, f, s, u}
check_hash(s1)
# dict
d1 = {s: i, u: l}
check_hash(d1)

# output:
<type 'int'> hashable: 5
<type 'long'> hashable: -9223372036854775808
<type 'float'> hashable: 1073741824
<type 'str'> hashable: 840651671246116861
<type 'unicode'> hashable: 2561679356228032696
<type 'tuple'> hashable: 1778989336750665947
<type 'object'> hashable: 270043150
<type 'list'> unhashable
<type 'set'> unhashable
<type 'dict'> unhashable
```

我们可以看到 set、list、dict 三个类型是不可哈希的。

为什么这三个类型是不支持哈希的？从哈希计算的方法上我们可以知道，对于可变的类型计算哈希值是不可靠的，当数据发生变化时哈希值也要变化。哈希计算的意义在于用哈希值来区分变量，哈希值会随着变量内容而变化，所以对于这类可变类型来说，不支持哈希值是合理的。

下面介绍下上述示例代码的一些细节，对于 Python 的深入理解有一定帮助。

## long 类型

我们都知道 Python 的整数是 int，但是很少有人注意到 long 类型。一般 long 的定义需要特定指出，在整数结尾加l，否则就是 int。

```python
a = 1l
print type(a)  # long

a = 1
print type(a)  # int
```

还有一种会产出 long 的情况，在 int 表示的范围超出了 sys.maxint (一般为 2^63-1，和系统有关)后，会自动从 int 转变为 long。

```python
import sys
a = sys.maxint
print type(a)  # int
a += 1
print type(a)  # long
```

这个隐藏的转换条件可能会导致某些逻辑问题，例如对变量类型是整数的判断，只考虑了 int，当整数非常大的时候会出现判断失败的问题。

```python
# i 可能会在超出 sys.maxint 后自动转为 long
if isinstance(i, int):
    # do something

# 判断整数更完整的方式
if isinstance(i, (int, long)):
    # do something
```

## 定义 set

定义 set 的方法，这里需要单独说一下。set 有多种定义的方法，一般使用 set(list) 或 set(tuple) 的方式来定义，但是还有个花括号的方法可以定义，这个大家使用的较少会被忽略，就是上述示例中的方式。

```python
l = ['a', 'b', 'a', 'c']
s = set(l)

# 使用花括号来定义
s = {'a', 'b', 'a', 'c'}
```

# 总结

本文总结了 Python 的 unhashable 基础类型，对于自定义的类型，需要自行实现哈希值的计算。简要探讨了不支持哈希的原因，笔者水平有限，本文内容都是个人理解，欢迎大家讨论。