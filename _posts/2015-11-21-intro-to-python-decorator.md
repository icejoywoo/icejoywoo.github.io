---
layout: post
title: Python 修饰器（Decorator）简介
category: python
tags: ['python', 'decorator']
---

# 简介

Python 的修饰器（Decorator）是一种非常便捷的修改函数的方式，不影响原函数的定义而对函数进行一些额外的封装，有点类似 AOP（Aspect Oriented Programming)，增加一些小功能却不侵入原有代码，非常简洁强大。

在实际使用中，常见的使用场景有日志、异常处理、计时和权限等，在很多优秀的第三方库中都有使用。

Python 中一般将定义在类内的函数叫作方法（Method），其他地方定义的函数叫作函数（Function）。修饰器对于二者是一样的，本文中主要用函数来描述。本文以 Python 2.7 版本为例。

# 函数

Python 的函数是一等公民，再简单说一下函数副作用（Side Effects）的问题。

## Function is a First-class Citizen

函数在 Python 中是一等公民，Python 也支持部分函数式编程的风格。所以先来介绍一下函数是一等公民是什么含义，这是一个非常重要的基本概念。

基本类型都是一等公民，以整型（Integer）为例来看下其基本使用方法。

```python
a = 5

def foo(a, b):
    return a + b

c = foo(a, 5)
```

整型是可以在任意地方进行初始化、赋值和定义的，可以作为函数的输入参数或返回值。既然在 Python 中函数也是一等公民，那么函数可以做和整型一样的事情。

```python

# lambda 的方式定义有局限，只能是一个 expression
foo = lambda a, b: a + b

# lambda 中 print 必须使用 from __future__ import print_function 中的 print 函数，这是 expression 和 statement 的区别，

def foo(a, b):
    return a + b

# 函数赋值
bar = foo

# 函数作为参数和返回值
def func_recorder(func):
    def wrapper(*args, **kwargs):
        print "calling %s" % func.__name__
        return func(*args, **kwargs)
    return wrapper
```

## 纯函数（Pure Function）

没有副作用（Side Effects）的函数就是纯函数。那么，什么是函数副作用了？函数副作用就是指函数除返回值外还修改了一些外部状态，这类问题的危害有：对于程序的调试和理解造成很大的困扰，因为不是显示修改了外部状态；一般认为函数多次调用应该产生相同的结果，带有副作用的函数不一定遵守这个规则。下面用[代码示例](http://interactivepython.org/runestone/static/pip2/Functions/SideEffects.html)说明函数副作用具体表现是什么。

```python
# 对于不可变类型（或值类型）

# with side effects
def double(n):
    global y
    y = 2 * n  # 这里修改了外部的全局变量

y = 5
double(y)
print y  # 10
double(y)
print y  # 20

# without side effects
def double(n):
    return 2 * n

y = 5
print double(y)  # 10
print double(y)  # 10

# 对于可变类型（或引用类型）

# with side effects
def appendit(lst):
    lst.append('last')  # 修改了传入的参数 lst
    return lst

mylst = ['one', 'two', 'three']
newlst = appendit(mylst)
print mylst  # ['one', 'two', 'three', 'last']
print newlst  # ['one', 'two', 'three', 'last']

# with side effects
def appendit(lst):
    result = lst[:]  # defensive copy! https://docs.python.org/2/library/copy.html
    result.append('last')
    return result

mylst = ['one', 'two', 'three']
newlst = appendit(mylst)
print mylst  # ['one', 'two', 'three']
print newlst  # ['one', 'two', 'three', 'last']
```

我们应该尽量编写没有副作用的函数，代码更容易理解和调试，当然特殊情况下可以使用这种方式，但是最好注释说明一下。

# 修饰器

修饰器是一种语法糖（Syntax Sugar），本质是一个传入函数参数并且返回函数的函数调用。这个语法是从 2.4 版本开始引入的，下面是一个类方法的例子，来说明修饰器的基本用法。

```python
# old style
class C(object):
    def foo(cls, y):
        print "classmethod", cls, y
    foo = classmethod(foo)

# decorator style
class C(object):
    @classmethod
    def foo(cls, y):
        print "classmethod", cls, y
```

从上面的例子，我们可以看出，修饰器的本质就是一个函数的调用。我们可以自定义一个修饰器，来进一步理解其本质。

```python
def func_logger(f):

    def inner(*args, **kwargs):
        func_args = ', '.join([repr(i) for i in args] + [k + '=' + repr(v) for k, v in kwargs.items()])
        print "invoking %s(%s)" % (f.__name__, func_args)
        return f(*args, **kwargs)

    return inner

def func_timer(f):

    def inner(*args, **kwargs):
        try:
            import time
            start = time.time()
            return f(*args, **kwargs)
        finally:
            print 'function[%s] elapsed time: %f' % (f.__name__, time.time() - start)

    return inner

@func_timer
@func_logger
def hello(name):  # <=> func_timer(func_logger(hello))
    print 'Hello,', name
    return 'Hello, %s' % name

hello('John')
# output:
# invoking hello('John')
# Hello, John
# function[inner] elapsed time: 0.000027
```

从上面的示例，我们可以看出：修饰器是一个以函数为参数并且返回函数的函数；修饰器是可以多个叠加在一起使用的。

Python 提供了一些内置的修饰器，例如 classmethod、staticmethod、property、functools.wraps 等。

## 被修饰的函数名问题

带有修饰器的函数，其函数名发生了变化，一般情况下是没问题的，但有些特殊情况需要函数名保持原样。其实上面的例子中，已经出现了这种情况，有个函数名叫 inner 的，而本身被修饰的函数叫 hello。

```python
@func_timer
def test_hello():
    assert hello('John') == 'Hello, John'

test_hello.__name__  # inner, expected: test_hello
```

在 nose 中寻找单测的方法是通过方法名前缀带有 test_，方法名改变会导致找不到这个单测函数。

```bash
$ nosetests

----------------------------------------------------------------------
Ran 0 tests in 0.001s

OK
```

我们需要在修饰器中将原来函数的名字保留下来。

```python
def func_timer(f):

    def inner(*args, **kwargs):
        try:
            import time
            start = time.time()
            return f(*args, **kwargs)
        finally:
            print 'function[%s] elapsed time: %f' % (f.__name__, time.time() - start)

    # inner 函数保留原来函数的名字
    inner.__name__ = f.__name__
    return inner
```

我们在运行一次单测，会发现一切 OK。

```bash
$ nosetests

----------------------------------------------------------------------
Ran 0 tests in 0.001s

OK
```

在 Python 的标准库中有一个 functools.wraps 的方法，用于解决这个问题，保留函数名和其他一些变量，实际编码中推荐使用这个内置的修饰器，有兴趣这个函数的实现，可以去阅读源码。

```python
import functools

def func_timer(f):

    @functools.wraps(f)
    def inner(*args, **kwargs):
        try:
            import time
            start = time.time()
            return f(*args, **kwargs)
        finally:
            print 'function[%s] elapsed time: %f' % (f.__name__, time.time() - start)

    return inner
```

## 带有参数的修饰器

有些修饰器是带有参数的，例如 flask 的 route。只要理解修饰器的本质就可以理解，再添加一层函数，返回一个无需参数的修饰器。

```python
import functools

def func_timer(debug=True):

    def wrapper(f):
        @functools.wraps(f)
        def inner(*args, **kwargs):
            try:
                if debug:
                    import time
                    start = time.time()
                return f(*args, **kwargs)
            finally:
                if debug:
                    print 'function[%s] elapsed time: %f' % (f.__name__, time.time() - start)
        return inner

    return wrapper


@func_timer(debug=True)
def hello(name):
    return 'Hello, %s' % name

hello('John')
# output: function[hello] elapsed time: 0.000006
```

示例中，可以通过 debug 参数来控制是否打印函数耗时。

## 获取被修饰函数的传入参数

高级的修饰器用法可能需要获取被修饰函数的参数，以便进行处理。这个时候我们可以借助于 Python 强大的 inspect 模块。

```python
import inspect

def id_validator(f):

    def inner(*args, **kwargs):
        func_args = inspect.getcallargs(f, *args, **kwargs)
        if '_id' in func_args:
            _id = func_args['_id']
            if isinstance(_id, basestring):
                return f(*args, **kwargs)
            else:
                raise ValueError('id type is not validated.')
        return f(*args, **kwargs)
    return inner


@id_validator
def dummy(_id):
    return _id

@id_validator
def foo(action, _id):
    return '%s %s' % (action, _id)

print dummy('23')  # 23
print foo('add', '45')  # add 45
print foo('add', 45)  # exception: ValueError: id type is not validated.
```

# 小结

本文主要介绍了修饰器的基本语法，如何自定义和一些简单的高级用法，修饰器是可以极大简化逻辑减少重复代码的利器，希望大家多在编码实践中去应用。

水平有限，如有错漏，请留言指正！

# 参考资料
1. [Decorators I: Introduction to Python Decorators](http://www.artima.com/weblogs/viewpost.jsp?thread=240808)
2. [PythonDecoratorLibrary](https://wiki.python.org/moin/PythonDecoratorLibrary)
3. [The decorator module](http://pythonhosted.org/decorator/documentation.html)
4. [Python修饰器的函数式编程](http://coolshell.cn/articles/11265.html)
5. [Python装饰器入门与提高](http://www.xiaoh.me/2016/03/27/python-decorator/)
6. [Functional Programming HOWTO](https://docs.python.org/2/howto/functional.html)
