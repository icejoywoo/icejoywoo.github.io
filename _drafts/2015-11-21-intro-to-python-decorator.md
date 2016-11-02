---
layout: post
title: Python Decorator 简介
category: python
tags: ['python', 'decorator']
---

# 简介

Python 的 Decorator 是一种非常便捷的修改函数的方式，不影响原函数的定义而对函数进行一些额外的封装，有点类似 AOP（Aspect Oriented Programming)，增加一些小功能却不侵入原有代码，非常简洁强大。

在实际使用中，常见的使用场景有日志、异常处理、计时和权限等，在很多优秀的第三方库中都有使用。

# 函数是一等公民

先解释一下函数式编程中的函数是一等公民（function is a first-class citizen），这是一个非常重要的基本概念。

整数也是一等公民，看下整数的基本使用方法。

```python
a = 5

def foo(a, b):
    return a + b

c = foo(a, 5)
```

整数是可以在任意地方进行初始化、赋值和定义的，可以作为函数的输入参数或返回值。函数可以做同样的事情，就可以称为一等公民。

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

函数的副作用（side effect）


# 参考资料
1. [Decorators I: Introduction to Python Decorators](http://www.artima.com/weblogs/viewpost.jsp?thread=240808)
2. [PythonDecoratorLibrary](https://wiki.python.org/moin/PythonDecoratorLibrary)
3. [The decorator module](http://pythonhosted.org/decorator/documentation.html)
4. [Python修饰器的函数式编程](http://coolshell.cn/articles/11265.html)
5. [Python装饰器入门与提高](http://www.xiaoh.me/2016/03/27/python-decorator/)
