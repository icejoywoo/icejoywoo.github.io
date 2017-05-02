---
layout: post
title: Python 数据类型详解
category: python
tags: ['Python']
---

众所周知，Python 内置了多种数据类型，有基本类型：int、long、float、string、tuple、list、set、dict等，除此之外标准库还自带了多种数据结构：OrderedDict、deque、heapq、bisect等。

本文主要以 Python 2.7 为主，介绍集合类型的用法，尽量将常见的实践都列举出来，希望读者读完之后可以收获到一些新知识点。

# 基本类型

## int / long / float

数字类型大家经常用，但是依然有几点需要注意的：

int 与 long 一般无需太关注，int 无法表达的数会自动转换为 long，所以在对整数的类型判断时需要考虑这种特例。

```python
import sys
sys.maxint  # 9223372036854775807
a = sys.maxint
type(a)  # int
a += 1
type(a)  # long

isinstance(a, (int, long))  # True
```

float 默认精度为小数点后 13 位，所以当格式化 float 超过 13 位小数的时候，仍然可以显示，但是显示的数字毫无意义。

```python
'%.13f' % (5000.0/3)  # '1666.6666666666667'
'%.30f' % (5000.0/3)  # '1666.666666666666742457891814410686'
```

float 有表示精度的问题，导致会出现一些错误的结果，这个与其他语言一致，主要是因为二进制无法精确地表示某些小数导致，可以参考[官方文档](https://docs.python.org/2/tutorial/floatingpoint.html#representation-error)。

```python
0.1 + 0.2  # 0.30000000000000004
```

针对 float 的问题，可以考虑采用 [decimal](https://docs.python.org/2/library/decimal.html) 模块。

```python
import decimal
# prec 表示精度，默认为 28，包含 28 个数字，包含整数部分
decimal.getcontext()  # Context(prec=28, rounding=ROUND_HALF_EVEN, Emin=-999999999, Emax=999999999, capitals=1, flags=[], traps=[InvalidOperation, DivisionByZero, Overflow])
# 修改精度
decimal.getcontext().prec = 30

decimal.Decimal(5000.0)/3  # Decimal('1666.666666666666666666666667')

decimal.Decimal(0.1) + decimal.Decimal(0.2)  # Decimal('0.30000000000000001665334536937734810635447502136230')
```

## string / unicode

Python 2.x 的一个字符串编码问题，是初学者的一个痛，主要是由于有两种字符串的类型存在导致。

unicode 是一种统一的编码方式，string 是带有编码的二进制字符串，可以用来保存二进制。

为了避免中文编码问题，有两条好的实践：在 Python 内部尽量全部使用 unicode；在与外部交互的时候尽量使用 utf-8 编码的 string。这样可以有效地解决编码问题，各类问题的排查也是从这两类问题开始。

一点说明：Python 的单引号和双引号完全等价，就是说 Python 没有 char 这样的类型，只能用单个字符的字符串来表示。

```python
a = u'中国'
repr(a)  # u'\u4e2d\u56fd'

# 在某些类库中可能会获得下面的字符串，这个很可能是因为使用 latin-1 来转换为了 unicode 导致的
a = u'\xe4\xb8\xad\xe5\x9b\xbd'
unicode('中国', 'latin-1')  # u'\xe4\xb8\xad\xe5\x9b\xbd'

# 解决方法是用 latin-1 编码 encode 回去，在 decode 为 utf-8 即可
a.encode('latin-1')  # '\xe4\xb8\xad\xe5\x9b\xbd'
a.encode('latin-1').decode('utf-8')  # u'\u4e2d\u56fd'
```

字符串定义的时候带有 u 前缀，表示为 unicode 类型。

> 在 Python 3 中默认即为 unicode，定义 str 需要使用 b 前缀；在 Python 2 中默认是 str，定义 unicode 需要使用 u 前缀。

另外还有 r 前缀，表示里面 \\ 无需转移，一般在正则表达式的时候使用，减少 \\ 的输入次数，较为方便。

多行字符串的定义有两种方式，一种是使用 """&lt;string&gt;""" 来定义，还有一种使用多个单行字符串拼接。

```python
multi_lines = """This is a test.
This is second line."""

# 这里使用来括号，而非 \ 来换行，代码更容易阅读
multi_lines = ("This is a test.\n"
               "This is second line.")

# 下面用 \ 来换行的会影响代码阅读的流畅度，不推荐使用
multi_lines = "This is a test.\n"\
              "This is second line."
```

字符串不要进行频繁的拼接操作，会直接影响性能，可以考虑采用 list 来保存，最后 join 完成拼接。这点在 Java 中会使用 StringBuffer 来进行拼接，JVM 还为此做了针对性的优化，Python 中我们需要自己来做优化。

## tuple

## list

## dict

## set / frozenset

# 标准库中的数据结构

## deque

## dict 扩展类型

OrderedDict

defaultdict

counter

## heapq

## bisect

#
