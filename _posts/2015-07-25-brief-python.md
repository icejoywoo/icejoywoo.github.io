---
layout: post
title: Python知识点汇总
category: python
tags: ['python']
disqus: true
---
## {{ page.title }}

Life is short, you need Python. <http://www.zhihu.com/question/20830223>

Python是一门简洁优雅的强类型动态语言, 目前有2.x和3.x两个分支, 本文以2.7.x来进行汇总, 基本是一些基础语言和基本类型的使用总结, 方便快速重温知识点.
不是一个入门教程, 是一个知识点的汇总.

Python的官网: <https://www.python.org/>
PEP(Python Enhancement Proposals): <https://www.python.org/dev/peps/> (PEP是个好东西, Python程序员必备)

第一个经典的程序。

```python
print "Hello, World!"
```

# 基本类型

Data Model: <https://docs.python.org/2/reference/datamodel.html>
Sequence Types: <https://docs.python.org/2/library/stdtypes.html#sequence-types-str-unicode-list-tuple-bytearray-buffer-xrange>

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

# 字符串格式化, 有%和format两种方式
print "Hello, %s!" % 'world'  # Hello, world!
print "%d + %d is %d" % (4, 4, 8)  # 4 + 4 is 8

params = {
    'title': 'manager',
    'name': 'John',
    'age': 25
}
print "My name is %(name)s. I am a %(title)s. I am %(age)d." % params  # My name is John. I am a manager. I am 25.

# 只有1个参数的时候可以不写序号
print "params is {}.".format(params)  # params is {'age': 25, 'name': 'John', 'title': 'manager'}.
print "Name is {1[name]}. Hello, {0}!".format('world', params)  # Name is John. Hello, world!
print "My name is {p[name]}. {{literal curly brace}}".format(p=params)  # My name is John. {literal curly brace}
```


format文档: <https://docs.python.org/2/library/string.html#format-string-syntax>

## 列表（list）

```python
a = [1, 'abc', None, 2.4, [1, 2, 3]]  # 可以存放多种类型
b = list()  # list函数可以将iterator转换为list，也可以申明为空的list，和[]定义是一样的
# 列表推导式(list comprehensions): 可以替代map和filter的功能
c = [i for i in a if i]  # [1, 'abc', 2.4, [1, 2, 3]]
d = [1, 4, 5, 0, 2, 3, 9]
e = [i + 3 for i in d]  # 同map(lambda i: i + 3, d): [4, 7, 8, 3, 5, 6, 12]
f = [i for i in d if i > 3]  # 同filter(lambda i: i > 3, d): [4, 5, 9]

# access by index
a[0]  # 1

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

# list的stack接口
# https://docs.python.org/2/tutorial/datastructures.html#using-lists-as-stacks
a = []
a.append(6)  # [6]
a.append(7)  # [6, 7]
a.pop()  # 7
a.pop()  # 6
```

1. 列表推导式([list comprehensions][])可以替代map和filter的功能
1. *list comprehensions文档: https://docs.python.org/2/tutorial/datastructures.html#list-comprehensions*

## 元组(tuple)

比较类似于list, 但是tuple是不可变的. 可以用作dict的key和set, 是可以hash的([hashable][]).

```python
a = (1, 2, 3)

a[0]  # 1

# 一个元素的tuple定义, 结尾要带一个逗号
b = ('hello',)
```

## 字典(dict)

```python
a = {'key': 'value', 5: 'five'}
# dict有多种初始化的方法
b = dict()  # {}
c = dict(a) # {5: 'five', 'key': 'value'}
d = dict(((1, 'one'), (2, 'two'), (3, 'three')))  # {1: 'one', 2: 'two', 3: 'three'}
e = dict(one=1, two=2, three=3)  # {'one': 1, 'three': 3, 'two': 2}

# 字典推导式(dict comprehensions)
# dict的key和value反转: {1: 'one'} -> {'one': 1}
f = {v: k for k, v in d.items()}

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

# dict.setdefault
a.setdefault('counter', 0)  # 当key中不存在'counter'的时候, 初始化为0, 否则无操作
# dict.get
a.get('counter', None)  # 当key中不存在'counter'的时候, 返回None, 否则返回其对应value
```

字典推导式([dict comprehensions][])可以极大简化代码

1. *注意: dict不保证key的顺序和其插入的顺序是一致的, 如果需要顺序可以参考[collections.OrderedDict](https://docs.python.org/2/library/collections.html#collections.OrderedDict "collections.OrderedDict")*
1. *注意: dict的key必须是可以hash的([hashable][]), list和dict都是不可hash的, 会报错: (TypeError: unhashable type: 'list')*

## 集合(set)

```python
# 将已有的list转换为set
a = [0, 2, 1, 0, 4, 3, 3]
b = set(a)  # {0, 1, 2, 3, 4}

# frozenset 不可变的set
f = frozenset(a)  # frozenset({0, 1, 2, 3, 4})

# 初始化空的set
empty_set = set()  # 这里不能使用{}来初始化,

# set是可以通过{}来进行定义的
c = {0, 3, 4, 5, 6, 7, 7}  # {0, 3, 4, 5, 6, 7}

# set comprehensions
d = {i for i in a if i > 2}  # {3, 4}

# 集合运算
a = {0, 1, 2, 3, 4, 5, 6}
b = {4, 5, 6, 7, 8, 9, 10}

# 交集
a & b  # {4, 5, 6}
a.intersection(b)  # {4, 5, 6}

# 并集
a | b  # {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
a.union(b)  # {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

# 差集
a - b  # {0, 1, 2, 3}
a.difference(b)  # {0, 1, 2, 3}

# 对称差(Symmetric difference)
a ^ b  # {0, 1, 2, 3, 7, 8, 9, 10}
a.symmetric_difference(b)  # {0, 1, 2, 3, 7, 8, 9, 10}

# frozenset和set进行集合运算的时候, 返回的类型是左边参数的类型
f & b  # frozenset({4})
b & f  # {4}
```

# 函数(function)

1. 默认函数参数列表中的可变参数: <https://docs.python.org/2/tutorial/controlflow.html#default-argument-values> <http://effbot.org/zone/default-values.htm>

# 类(class)

1. 多重继承的顺序 mro: <https://www.python.org/download/releases/2.3/mro/>

# 其他参考资料
1. Magic Methods: <http://www.rafekettler.com/magicmethods.html>
1. [官方手册]Python HOWTOs: <https://docs.python.org/2/howto/index.html>
1. [书]编写高质量代码：改善Python程序的91个建议: <https://book.douban.com/subject/25910544/>
1. [书]Python基础教程: <https://book.douban.com/subject/4866934/>

[list comprehensions]: https://www.python.org/dev/peps/pep-0202/ "PEP 202"
[dict comprehensions]: https://www.python.org/dev/peps/pep-0274/ "PEP 274"
[hashable]: https://docs.python.org/2/glossary.html#term-hashable "hashable"

{{ page.date | date_to_string }}
