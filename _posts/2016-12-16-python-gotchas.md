---
layout: post
title: Python 2 常见陷阱
category: python
tags: ['python']
---

Python 语言非常强大，但是也有一些疑惑的地方，非常容易困扰新手，甚至老手。所以，对一些常见易错的地方进行总结学习非常有必要。本文大部分从参考资料中收集，也有从笔者自身实践中发现的问题，希望可以在大家碰到类似问题的时候可以从容对待。

本文主要讨论 Python 2 的问题。

# Mutable Default Arguments

Python 的函数是可以接受默认参数设置的，但是可变默认参数会和一般预期不同，这个非常易犯的错误，第一次碰到往往一头雾水，很难找到问题。

```python
def foo(bar=[]):
    bar.append("baz")
    return bar


foo()  # ['baz']
foo()  # ['baz', 'baz'], expected: ['baz']
```

上面的代码，你可能期望的是 bar 在没有传入参数的时候是一个空的 list，但是实际上函数的默认参数只会被初始化一次，也就是说 bar 的默认参数就是 []，下次更改后，默认参数也跟着变了，不会再重新初始化为空 list。

修复这个问题的方法也很简单，设置 bar 为 None，当 bar 为默认的 None 的时候，初始化为空的 list。

```python
def foo(bar=None):
    if bar is None:
        bar = []
    bar.append("baz")
    return bar


foo()  # ['baz']
foo()  # ['baz']
```

需要注意，可变的类型有很多，常见的 list、dict、set 等都是。

# Late Binding Closures

closure 是闭包，闭包可以用 lambda 定义，也可以在函数内部定义，可以访问外层函数的变量。

```python
def create_multipliers():
    return [lambda x: i * x for i in range(5)]

[f(1) for f in create_multipliers()]  # [4, 4, 4, 4, 4], expected: [0, 1, 2, 3, 4]
```

因为 lambda 和 def 定义的函数没有区别，所以下面的写法可以也存在相同的问题。

```python
def create_multipliers():
    multipliers = []

    for i in range(5):
        def multiplier(x):
            return i * x
        multipliers.append(multiplier)

    return multipliers
```

导致这个问题的原因在与 late binding，在闭包中的变量是在调用的时候才会去寻找。以第一个 lambda 版本为例：lambda 定义的时候，i 的值都是符合预期的；但是在通过 f 调用的时候，这个时候 i 已经都遍历完了，这个时候的 i 为 4，所以所调用的 f 里面的 i 都是 4。

解决这个问题的方法是可以将 i 作为参数传入，利用函数默认参数的属性，保证 i 值在 lambda 中是符合预期的。

```python
def create_multipliers():
    return [lambda x, i=i: i * x for i in range(5)]

[f(1) for f in create_multipliers()]  # [0, 1, 2, 3, 4]
```

# Variable Scope Rule

变量作用域的规则导致的问题，一般也是在函数定义或者函数嵌套定义，出现多个作用域的情况下导致的。

```python
x = 10
# 定义不会报错
def foo():
    x += 1
    return x

foo()  # 调用时报错：UnboundLocalError: local variable 'x' referenced before assignment
```

这个代码非常具有代表性，+= 这个也是一个赋值操作（assignment），因为 python 是没有变量申明的操作，初始化就是申明，在 foo 内会将 x 当作一个局部变量（local variable）来搜索，foo 中并没有这个变量，会导致报错，找不到 x 变量。而代码本意是希望找外部的 x。这个问题的核心关键在于赋值语句，会使得变量变为一个局部变量。

这个问题的解决有两种方式：一种使用 global，这种方法局限性比较大，容易造成全局变量的污染和混乱；另一种方法避免赋值操作。

```python
x = 10
def foo():
    # 使用 global 来表明使用的 x 为全局变量
    global x
    x += 1
    return x

foo()  # 11

# 通过设置为 list，避免了在函数内对 x 的赋值操作，变成了对 list 中值的修改
x = [10]
def foo():
    x[0] += 1
    return x[0]

foo()  # 11
```

第二种方法明显略显 tricky，好好理解一下，下面再给出一个例子，原因和上面是一样的。

```python
l = [1, 2, 3]
def foo():
    l.append(4)
    return l

foo()
l  # [1, 2, 3, 4]

l = [1, 2, 3]
l = [1, 2, 3]
def foo():
    l += [4]
    return l

foo()  # 调用报错：UnboundLocalError: local variable 'l' referenced before assignment
```

在 Python 3 中，这个问题有了新的解决方法，引入了新的关键字 nonlocal（[PEP 3104](https://www.python.org/dev/peps/pep-3104/)）来处理这种情况，也需要特殊说明一下。

```python
x = 10
def foo():
    # 这种情况还是要用 global，因为 x 确实是 global 变量
    nonlocal x
    x += 1
    return x

# 报错：SyntaxError: no binding for nonlocal 'x' found
```

nonlocal 主要解决的嵌套函数定义的时候，访问外部函数作用域变量。上面的情况 x 是全局变量，nonlocal 是无法搜索到的，需要指定为 global。

```python
def foo():
    x = 10
    def bar():
        nonlocal x
        x += 1
        return x
    return bar

foo()()  # 11
```

# try ... except ...

异常捕获的语句，这里有个非常容易犯的错误，在我们希望捕获多个异常的时候，可能会写出下面的代码，最后发现不符合预期。

```python
try:
    l = ["a", "b"]
    int(l[2])
except ValueError, IndexError:
    pass

# IndexError: list index out of range
```

上面的语法是错误的，因为历史问题，上面的语法等同于：

```python
try:
    l = ["a", "b"]
    int(l[2])
except ValueError as IndexError:
    pass
```

将异常赋值给了 IndexError 的变量，单个异常的捕获是有两种写法的。

```python
try:
    # ...
except ValueError as e:
    print e

try:
    # ...
except ValueError, e:
    print e
```

捕获多个异常的正确写法如下：

```python
try:
    l = ["a", "b"]
    int(l[2])
except (ValueError, IndexError) as e:
    pass
```

# 参考

1. [Common Gotchas](http://docs.python-guide.org/en/latest/writing/gotchas/)
2. [Buggy Python Code: The 10 Most Common Mistakes That Python Developers Make](https://www.toptal.com/python/top-10-mistakes-that-python-programmers-make)
3. [Python 2.x gotcha's and landmines](http://stackoverflow.com/questions/530530/python-2-x-gotchas-and-landmines)
