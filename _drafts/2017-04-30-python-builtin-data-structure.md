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
