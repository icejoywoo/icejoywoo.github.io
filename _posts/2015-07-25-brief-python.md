---
layout: post
title: Python知识点整理
category: python
tags: ['python']
---

有句话说得好啊：“Life is short, you need Python!”

Python是一门简洁优雅的强类型动态语言，目前有2.x和3.x两个分支，本文以2.7.x来进行汇总，
基本是一些基础语言和基本类型的使用总结，方便快速重温知识点。

**注意：不是一个入门教程, 是一个知识点的汇总.**

应该常去的几个地方：

- [Python的官网](https://www.python.org/)
- [PEP(Python Enhancement Proposals)](https://www.python.org/dev/peps/)(PEP是个好东西, Python程序员必备)
- [官方手册](https://docs.python.org/2/index.html)

个人感觉学好python的最好方法，就是多看[官方手册](https://docs.python.org/2/index.html)，
平时碰到的很多问题可以在手册中找到相关的解答，要好好理解消化，把手册当成是最权威的指南。

再来一个经典的入门脚本。

```python
print "Hello, World!"
```

# 获取帮助

Python解释器提供了几种方便的获取帮助的方法，常用help和dir两个函数。

```python
help(5)  # 显示对应类型的文档

dir(5)  # 显示对应类型所有的方法和属性

abs.__doc__  # 显示对象的文档属性
```


# 基本类型

官方文档中基本类型的说明：

  - [Data Model](https://docs.python.org/2/reference/datamodel.html)
  - [Sequence Types](https://docs.python.org/2/library/stdtypes.html#sequence-types-str-unicode-list-tuple-bytearray-buffer-xrange)


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

### 扩展阅读

- [format官方文档](https://docs.python.org/2/library/string.html#format-string-syntax)

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
1. **[list comprehensions文档](https://docs.python.org/2/tutorial/datastructures.html#list-comprehensions)**

## 元组(tuple)

比较类似于list, 但是tuple是不可变的. 可以用作dict的key和set, 是可以hash的([hashable][]).

```python
a = (1, 2, 3)

a[0]  # 1

# 一个元素的tuple定义, 结尾要带一个逗号
b = ('hello',)

hash(b)  # -1171690294
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

1. **注意: dict不保证key的顺序和其插入的顺序是一致的, 如果需要顺序可以参考[collections.OrderedDict](https://docs.python.org/2/library/collections.html#collections.OrderedDict "collections.OrderedDict")**
1. **注意: dict的key必须是可以hash的([hashable][]), list和dict都是不可hash的, 会报错: (TypeError: unhashable type: 'list')**

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

```python
# 函数的定义
def f(x):
    """ This is a sample function.
    Args:
        x: input number
    Return:
        x + 1
    """
    return x + 1

# lambda的定义, 默认表达式的值为返回值，有局限性
f = lambda x: x + 1

f(3)  # 4

# 可变参数, args是按顺序的tuple，kwargs是一个dict
def f(*args, **kwargs):
    print args, kwargs

f(1, 2, a=3, b=4)  # (1, 2) {'a': 3, 'b': 4}

# 默认参数
def f(x, factor=1, addend=2):
    return x * factor + addend

f(5)  # 7
# 可以通过名字来调用后面的参数，无需依赖顺序
f(5, addend=3)  # 8
f(5, 2)  # 12

# 注意：默认参数中有可变参数的时候
def f(a, l=[]):
    """ 本意是希望在默认情况下每次调用初始化一个空的list给l
    """
    l.append(a)
    return l

f(1)  # [1]
# 因为l是list，是可变类型，def在定义函数的同时会执行默认参数的初始化，之后不会因为每次调用而再次被执行
f(1)  # [1, 1]
f(1)  # [1, 1, 1]

# 查看函数的默认参数
 f.func_defaults  # ([1, 1, 1],)

# 改正
def f(a, l=None):
    if l is None:
        l = []
    l.append(a)
    return l

f(1)  # [1]
f(1)  # [1]

# 可以利用默认参数的特性，为函数提供一个缓存功能
def d(k, v=None, cache={}):
    if v:
        cache[k] = v
        return cache
    else:
        return cache.get(k, None), cache

print d("key")  # (None, {})
print d("key", "value")  # {'key': 'value'}
print d("key")  # ('value', {'key': 'value'})

# 利用闭包来实现类似功能

def _d():
    cache = {}
    def wrapper(k, v=None):
        if v:
            cache[k] = v
            return cache
        else:
            return cache.get(k, None), cache
    return wrapper

d = _d()

print d("key")  # (None, {})
print d("key", "value")  # {'key': 'value'}
print d("key")  # ('value', {'key': 'value'})

# 利用函数的magic method来实现
class D(object):

    def __init__(self):
        self.cache = {}

    def __call__(self, k, v=None):
        if v:
            self.cache[k] = v
            return self.cache
        else:
            return self.cache.get(k, None), self.cache

d = D()

print d("key")  # (None, {})
print d("key", "value")  # {'key': 'value'}
print d("key")  # ('value', {'key': 'value'})
```
默认函数参数列表中的可变参数:

 - [官方文档中关于可变参数的说明](https://docs.python.org/2/tutorial/controlflow.html#default-argument-values)
 - [Default Parameter Values in Python](http://effbot.org/zone/default-values.htm)

# 类(class)

```python
# 类的基本定义
class T:

    def __init__(self, name):
        """ constructor 构造函数
        """
        self.name = name

    def hello(self):
        return "hello, %s!" % self.name

t = T('John')
t.hello()  # hello

# new-style class 继承自object就是new-style class, since python 2.2
class N(object):
    pass
```

python new-style class的slots详解

文档中的描述: This class variable can be assigned a string, iterable, or sequence of strings with variable names used by instances. If defined in a new-style class, \_\_slots\_\_ reserves space for the declared variables and prevents the automatic creation of \_\_dict\_\_ and\_\_weakref\_\_ for each instance.

```python
import sys
from guppy import hpy


class Person_(object):
    __slots__ = ("name", "age", "gender")

    def __init__(self):
        pass


class Person(object):
    def __init__(self):
        pass


if __name__ == "__main__":
    persons = []
    for i in xrange(100000):
        p = Person()
        p.name = "name_%d" % i
        p.age = i
        p.gender = "female"
        persons.append(p)

    persons_ = []
    for i in xrange(100000):
        p = Person_()
        p.name = "name_%d" % i
        p.age = i
        p.gender = "female"
        persons_.append(p)

    print "size without slots: %d" % sum([sys.getsizeof(p) for p in persons])
    print "size of the __dict__ without slots: %d" % sum([sys.getsizeof(p.__dict__) for p in persons])
    print "size of the __weakref__ without slots: %d" % sum([sys.getsizeof(p.__weakref__) for p in persons])
    print "size with slots: %d" % sum([sys.getsizeof(p) for p in persons_])

    h = hpy()
    print h.heap()
```

几点说明:

1. sys.getsizeof可以获取内建类型的bytes，对于自定义类型只可以获取直接占用的内存，
无法获取引用对象的内存，需要递归来获取真正的大小
([递归sys.getsizeof的实现参考](http://code.activestate.com/recipes/577504/))。
1. [guppy-pe的官网](http://guppy-pe.sourceforge.net/)

程序数据结果:

```
size without slots: 6400000
size of the __dict__ without slots: 28000000
size of the __weakref__ without slots: 1600000
size with slots: 7200000
Partition of a set of 724234 objects. Total size = 60815264 bytes.
 Index  Count   %     Size   % Cumulative  % Kind (class / dict of class)
     0 100000  14 28000000  46  28000000  46 dict of __main__.Person
     1 210735  29 10508280  17  38508280  63 str
     2 100000  14  7200000  12  45708280  75 __main__.Person_
     3 100000  14  6400000  11  52108280  86 __main__.Person
     4 199826  28  4795824   8  56904104  94 int
     5    176   0  1663168   3  58567272  96 list
     6   5707   1   457184   1  59024456  97 tuple
     7    201   0   212184   0  59236640  97 dict of type
     8     64   0   205312   0  59441952  98 dict of module
     9   1596   0   204288   0  59646240  98 types.CodeType
<93 more rows. Type e.g. '_.more' to view.>
```

1. [多重继承的顺序 mro](https://www.python.org/download/releases/2.3/mro/)
1. [Unifying types and classes in Python 2.2](https://www.python.org/download/releases/2.2.3/descrintro/)
1. [python中的 new-style class 及其实例详解](http://wiki.woodpecker.org.cn/moin/PyNewStyleClass)
1. [类中的\_\_slots\_\_](https://docs.python.org/2/reference/datamodel.html#slots)

# 其他

## all和any内置函数

all和any都是用于iterable对象的，必须是一个可遍历的对象，Python 2.5开始引入的。

all函数的含义：当iterable中所有的对象都为True的时候，才返回True；当iterable为空的时候,返回True。等价实现如下：

```python
def all(iterable):
    for element in iterable:
        if not element:
            return False
    return True
```

any函数的含义：当iterable中任意的对象为True的时候，都返回True；当iterable为空的时候，返回False。等价实现如下：

```python
def any(iterable):
    for element in iterable:
        if element:
            return True
    return False
```

简单示例如下

```python
a = [True, True]
b = [True, False]

assert any(a)
assert all(a)

assert any(b)
assert not all(b)
```

## with statement用法

with是一种语法糖（syntax sugar），通常用来进行资源的关闭操作。

传统的打开一个文件，然后关闭，在读取文件进行操作的过程可能出现异常，这个时候需要进行异常捕获，资源的关闭需要放在finally语句中，保证文件正常关闭。

```python
f = open('test.txt')
try:
    # do something
    pass
finally:
    f.close()
```

使用with语句可以简化这部分代码，文件的关闭不需要显示调用。

```python
with open('test.txt') as f:
    # do something
    pass
```

with可以一次打开多个文件

```python
with open('a') as a, open('b') as b:
    # do something
    pass
```

## pep8 代码规范

pep8是python的一个代码规范，有pep8的一个工具作为检测工具，还有一个autopep8的辅助工具，可以自动修改代码格式。

```bash
# 通过pip安装
$ pip install pep8

# 检查目录的代码，exclude忽略文件夹，ignore忽略某些错误
$ pep8 --exclude=migrations --ignore=E501,E265,E731 src
src/validator.py:147:31: W503 line break before binary operator
src/log.py:9:1: E402 module level import not at top of file
```


1. [pep8](http://pep8.readthedocs.org/)
1. [autopep8](https://github.com/hhatto/autopep8)
1. [pep8 Error Codes](http://pep8.readthedocs.org/en/latest/intro.html#error-codes)
1. [PEP 008](https://www.python.org/dev/peps/pep-0008/)

## 延伸阅读

1. [PEP 343 -- The "with" Statement](https://www.python.org/dev/peps/pep-0343/)
1. [The with statement](https://docs.python.org/2/reference/compound_stmts.html#the-with-statement)
1. [Built-in Functions](https://docs.python.org/2/library/functions.html)
1. [PEP 339 -- Design of the CPython Compiler](https://www.python.org/dev/peps/pep-0339/)
1. [Python Best Practice Patterns](http://stevenloria.com/python-best-practice-patterns-by-vladimir-keleshev-notes/)
1. [Understanding Python Decorators in 12 Easy Steps!](http://simeonfranklin.com/blog/2012/jul/1/python-decorators-in-12-steps/)

# 其他参考资料
1. [Magic Methods](http://www.rafekettler.com/magicmethods.html)
1. [Awesome Python: A curated list of awesome Python frameworks, libraries and software](http://awesome-python.com/)
1. [Python HOWTOs](https://docs.python.org/2/howto/index.html)
1. [《编写高质量代码：改善Python程序的91个建议》](https://book.douban.com/subject/25910544/)
1. [《Python基础教程》](https://book.douban.com/subject/4866934/)
1. [*Python Algorithms: Mastering Basic Algorithms in the Python Language*](http://book.douban.com/subject/4915945/)

[list comprehensions]: https://www.python.org/dev/peps/pep-0202/ "PEP 202"
[dict comprehensions]: https://www.python.org/dev/peps/pep-0274/ "PEP 274"
[hashable]: https://docs.python.org/2/glossary.html#term-hashable "hashable"
