---
layout: post
title: Python 数据类型详解系列(2) - 内置集合类型
category: python
tags: ['Python']
---

[上一篇]({% post_url 2017-04-30-python-builtin-data-types-1 %})中讲解了 Python 的基本类型，本篇继续讲解 Python 的数据类型，本篇主要讲解集合类型：tuple、list、set和dict。

# 集合类型

在 Python 文档中，有一个类型 [Sequence Types](https://docs.python.org/2/library/stdtypes.html#sequence-types-str-unicode-list-tuple-bytearray-buffer-xrange)，其中包括了 str 和 unicode，因为字符串是 char 的 container。但是，在本系列文章中，将 str 和 unicode 归类为基本类型。

## tuple

tuple 中文名元组，是一个非常重要的数据结构，tuple 的特点是长度在定义后不可变，不允许赋值，但是如果包含的元素有 list、dict 等可变类型的话，这些成员还是可以进行修改的。

list 和 dict 等可变类型是不可以支持计算 hash，tuple 的不可变可以对 list 和 dict 进行转换，然后完成 hash 的计算。

```python
l = [1, 2, 3]

hash(l)  # raise TypeError: unhashable type: 'list'
tuple(l)  # (1, 2, 3)
hash(tuple(l))  # 2528502973977326415

d = {'a': 1, 'b': 2}

hash(d)  # raise TypeError: unhashable type: 'dict'
tuple(d.items())  # (('a', 1), ('b', 2))
hash(tuple(d.items()))  # 5873177160820425501
```

tuple 一般有两种方式可以定义

```python
# 直接定义
a = (1, 2, 3)

# 从可迭代的对象中转换
b = tuple([1, 2, 3])  # (1, 2, 3) list to tuple

def numbers(f, t):
    i = f
    while i < t:
        yield i
        i += 1

c = tuple(numbers(4, 10))  # (4, 5, 6, 7, 8, 9)  generator to tuple
```

### 常用 API

```python
# tuple 加法
(1, 2, 3) + (4, 5, 6)  # (1, 2, 3, 4, 5, 6)

# 判断是否存在
3 in (1, 2, 3)  # True
6 in (1, 2, 3)  # False

# 遍历
t = (1, 2, 3)
for v in t:
    print v
# output:
# 1
# 2
# 3

# 带有 index 的遍历
for i, v in enumerate(t):
    print i, v
# output:
# 0 1
# 1 2
# 2 3

# count 统计元素的个数
a = (1,2,2,3)
a.count(1)  # 1
a.count(2)  # 2

# index(value, [start, [stop]]) 返回第一个值的索引
a.index(2)  # 1
a.index(2, 2)  # 2
a.index(4)  # raise ValueError: tuple.index(x): x not in tuple
```

## list

list 可以支持数组、链表、栈等多种数据结构的 API，长度可变，可以支持追加元素、任意位置插入元素、删除元素、排序、反转等操作。

list 定义的方式比较多，支持的 API 也比较丰富，可以通过简单的封装实现一些常见的数据结构。

```python
# 定义
l = [1, 2, 3]

def numbers(f, t):
    i = f
    while i < t:
        yield i
        i += 1

l = list(numbers(4, 10))  # [4, 5, 6, 7, 8, 9]  generator to list

# 数组
a = [1, 2, 3, 4]
a[0]  # 1
a[0] = 5  # [5, 2, 3, 4]

# 链表
a = [1, 2, 3, 4]
a.insert(2, 5)  # [1, 2, 5, 3, 4]
a.append(5)  # [1, 2, 5, 3, 4, 5]

# 栈
a = []
a.append(5)  # [5]
a.pop()  # 5

# 遍历（与 tuple 一样）
l = [1, 2, 3]
for v in l:
    print v
# output:
# 1
# 2
# 3

# 带有 index 的遍历（与 tuple 一样）
for i, v in enumerate(l):
    print i, v
# output:
# 0 1
# 1 2
# 2 3
```

排序可以使用 sorted 也可以使用 list.sort，二者区别主要是 list.sort 会改变 list 的值，而 sorted 是返回一个有序的 list。

```python
# 排序
l = [3, 5, 1, 9, 0, 2, 7]
sorted(l)  # [0, 1, 2, 3, 5, 7, 9]
l  # [3, 5, 1, 9, 0, 2, 7]
l.sort()  # l: [0, 1, 2, 3, 5, 7, 9]
```

## dict

dict 字典类型，在其他语言中也叫做 map 或关联数组，本质都是一样的。

```python
# 直接定义
{'a': 1, 'b': 2}  # {'a': 1, 'b': 1}

# 使用 dict 来构造，kv pair 的 list 或 tuple 等都可以，只要可以迭代就可以
dict((('a', 1), ('b', 1)))  # {'a': 1, 'b': 1}
dict([['a', 1], ['b', 1]])  # {'a': 1, 'b': 1}

# 判断 key 是否存在
'a' in {'a': 1, 'b': 2}  # True
'c' in {'a': 1, 'b': 2}  # False

# 遍历
d = {'a': 1, 'b': 2}
for k in d:
    print k
# output:
# a
# b

for k, v in d.items():
    print k, v
# output:
# a 1
# b 2

d.keys()  # ['a', 'b']
d.values()  # [1, 2]
d.items()  # [('a', 1), ('b', 2)]

# 对应有三个 view 方法
# 返回 view object，可以感知到 dict 的变化
d.viewkeys()
d.viewvalues()
d.viewitems()
```

## set / frozenset

set 就是元素唯一的集合，对元素本身有要求，需要可以计算 hash，例如 list 或 dict 就不可以作为 set 的元素。

set 的实现是一个忽略 value 的 dict，dict 本身的 key 就是唯一的，这种实现方式很常见。

```python
# 直接定义
{1, 1, 3, 4}  # {1, 3, 4}

# 从 list 或 tuple 转换而来
set([1, 2, 3, 3, 4])  # {1, 2, 3, 4}

# 判断是否存在
a = {1, 2, 3, 4}
1 in a  # True
5 in a  # False
```

set 还有个非常重要的 API，就是支持交集、并集、差集等的集合计算，这个在很多场景下都需要使用。

```python
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

# 并集
a | b  # set([1, 2, 3, 4, 5, 6])
a.union(b)  # set([1, 2, 3, 4, 5, 6])

# 交集
a & b  # set([3, 4])
a.intersection(b)  # set([3, 4])

# 差集
a - b  # set([1, 2])
a.difference(b)  # set([1, 2])

# 对等差分
a ^ b  # set([1, 2, 5, 6])
a.symmetric_difference(b)  # set([1, 2, 5, 6])

# 包含与被包含（子集或超集）
c = {2, 3}

a > c  # True a 包含 c
c > c  # False
c >= c  # True
c < a  # True
```

frozenset 是一个不可变的 set，API 与 set 一致。例如：set 可以通过 add 新增元素，frozenset 不可以。

```python
a = frozenset([1, 1, 2, 3])

a.add(5)  # raise AttributeError: 'frozenset' object has no attribute 'add'
```

# 标准库中的数据结构

Python 标准库中还有一些数据结构，可以满足对数据结构的需求，使用方便，效率比较快。详细的使用方法，可以去参考官方文档，本节只简单介绍。

## deque

deque（double-ended queue）是一个双端队列，在前后插入元素的时间复杂度为 O(1)，list 在前面或中间 insert 元素的时间复杂度为 O(n)。

deque 的 API 和 list 比较类似，但是多了在前面操作的一些方法，例如 appendleft、extendleft、popleft。

## namedtuple

namedtuple 是一个可以通过属性名来访问元素的 tuple，实现是通过创建一个 tuple 子类，相对于 tuple 只能通过下标来访问，在代码可读性上有很大提高。

需要注意的是，namedtuple 性能上比 tuple 差很多，所以在对性能有要求的场景还是使用 tuple 比较好。

```python
Point = namedtuple('Point', ['x', 'y'])

p = Point(1, 2)
p  # Point(x=1, y=2)
p.x  # 1
p.y  # 2
```

## OrderedDict

一个 key 按照插入顺序的 dict，API 与 dict 一致，解决了某些场景需要依赖 key 的插入顺序。

```python
d = OrderedDict()
d['b'] = 1
d['a'] = 2
# OrderedDict([('b', 1), ('a', 2)])

d = {}
d['b'] = 1
d['a'] = 2
# {'a': 2, 'b': 1}
```

## defaultdict

带有默认值的 dict，当 key 不存在的时候，使用默认值。使用 defaultdict 可以在很多场景下简化代码逻辑，例如计数场景，每次需要判断 key 是否存在，不存在就初始化为 0，这种场景下 defaultdict 非常适用。

```python
a = defaultdict(int)
a['a']  # 0
a['b'] += 1
# defaultdict(int, {'a': 1, 'b': 1})
```

## Counter

类似 multiset 的类，可以允许元素有重复，会统计元素的重复个数。

```python
# 用 iterable 来初始化
a = Counter('gallahad')  # Counter({'a': 3, 'd': 1, 'g': 1, 'h': 1, 'l': 2})
b = Counter({'red': 4, 'blue': 2})  # Counter({'blue': 2, 'red': 4})

a + b  # Counter({'a': 3, 'blue': 2, 'd': 1, 'g': 1, 'h': 1, 'l': 2, 'red': 4})
```

## heapq

heapq 是一个堆实现，可以用于构建和维护一个堆，里面有个比较重要的方法，heapq.merge 可以将多个有序的 iterable 合并为有序的一个，归并排序的方法，这个方法可以用于实现外排。

# 总结

Python 内建类型和标准库中都包含了很多集合类型，灵活使用这些类型，可以写出更灵活简单的代码。
