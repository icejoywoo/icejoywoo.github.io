---
layout: post
title: Python语法简介
category: python
tags: ['python']
disqus: true
---
## {{ page.title }}

Life is short, you need Python. <http://www.zhihu.com/question/20830223>

Python是一门简洁优雅的强类型动态语言, 目前有2.x和3.x两个分支, 本文以2.7.x来进行汇总,
基本是一些基础语言和基本类型的使用总结, 方便快速重温知识点.

Python的官网: <https://www.python.org/>

第一个经典的程序。

```python
print "Hello, World!"
```

# 基本类型
## 字符串（str & unicode）

在python的2.x中, 字符串有两种类型: str和unicode. 很多乱码问题都源于字符串有两个类型的问题,
解决的一般思路是python内部都采用unicode, str的编码都统一采用utf-8.

字符串的赋值方式

```python
# '和"是没有区别的
a = "ab\tc"  # type: str
b = u"ab\tc"  # type: unicode
c = r"ab\tc"  # type: str
d = '''This is a multi-line string.
This is the second line.'''  # '''和"""两种都可以, 多行字符串
```

字符串的一些操作

```python
a = 'abcdefghijk'
print a[1:3]  # 'bc'
print a[::-1]  # 字符串反转: 'kjihgfedcba'
print list(reversed(a))  # reversed是反转为迭代器, ['k', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
print a.upper()  # 'ABCDEFGHIJK'
print a.lower()  # 'abcdefghijk'

# iterate
for c in a:
    print c
# 带有index的iterate
for i, c in enumerate(a):
    print i, c
```

## 列表（list）

```python
a = [1, 'abc', None, 2.4, [1, 2, 3]]  # 可以存放多种类型
b = list()  # list函数可以将iterator转换为list，也可以申明为空的list，和[]定义是一样的
# 列表推导式(list comprehensions): 可以替代map和filter的功能
c = [i for i in a if i]  # [1, 'abc', 2.4, [1, 2, 3]]
d = [1, 4, 5, 0, 2, 3, 9]
e = [i + 3 for i in d]  # 同map(lambda i: i + 3, d): [4, 7, 8, 3, 5, 6, 12]
f = [i for i in d if i > 3]  # 同filter(lambda i: i > 3, d): [4, 5, 9]

# 遍历
for i in a:
    print i

# list.sort
a = [1, 4, 5, 0, 2, 3, 9]
a.sort()  # 从小到大
print a  # [0, 1, 2, 3, 4, 5, 9]
a.sort(reverse=True)  # 从大到小
print a  # [9, 5, 4, 3, 2, 1, 0]

a = [
    {'name': 'John', 'age': 20},
    {'name': 'George', 'age': 23},
    {'name': 'Susan', 'age': 21},
    {'name': 'Mike', 'age': 25},
]
a.sort(key=lambda i: i['age'])
print a  # [{'age': 20, 'name': 'John'}, {'age': 21, 'name': 'Susan'}, {'age': 23, 'name': 'George'}, {'age': 25, 'name': 'Mike'}]
```

列表推导式([list comprehensions][]): 可以替代map和filter的功能

[list comprehensions]: https://www.python.org/dev/peps/pep-0202/ "PEP 202"

## 字典(dict)

```python
a = {'key': 'value', 5: 'five'}
b = dict()  # {}
c = dict(a) # {5: 'five', 'key': 'value'}
d = dict(((1, 'one'), (2, 'two'), (3, 'three')))  # {1: 'one', 2: 'two', 3: 'three'}

# 字典推导式([dict comprehensions][])
# dict的key和value反转: {1: 'one'} -> {'one': 1}
e = {v: k for k, v in d.items()}

# 遍历: keys和iterkeys, values和itervalues, items和iteritems, iter开头的方法返回一个迭代器, 前者返回是一个list
# 只遍历key
for k in a:
    print k

for k in a.keys():
    print k

# 只遍历value
for v in a.values():
    print v

# key和value一起遍历
for k, v in a.items():
    print k, v
```

字典推导式(dict comprehensions)

*注意: dict不保证key的顺序和其插入的顺序是一致的, 如果需要顺序可以参考[collections.OrderedDict](https://docs.python.org/2/library/collections.html#collections.OrderedDict "collections.OrderedDict")*
[dict comprehensions]: https://www.python.org/dev/peps/pep-0274/ "PEP 274"


{{ page.date | date_to_string }}
