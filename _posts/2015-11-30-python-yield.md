---
layout: post
title: Python yield 关键字的两种用法
category: python
tags: ['python', 'yield', 'generator']
---

本文主要是介绍 Python 中的 yield 关键字的用法，yield 的基本用法是用来产生生成器（generator），yield 最大的特点在于上下文切换。下面通过一些简单的例子来解释这两种用法。

# 基本用法

生成器是一种非常有用的类型，最大的好处在于其数据的产生是在需要使用的时候才产生，可供一次性遍历，此外还可以做到数据的返回值是无穷多，例如每次返回一个递增值，从0开始一直递增下去。传统的方式是无法做到的，生成器在很多场景下有着非常重要的作用。

下面详细讲解其执行的顺序，可以通过 debug 的单步调试，来验证其运行顺序。

```python
def gen():
    # do something (a)
    yield item # (b)
    # do something (c)

for i in gen():
    # do something with i (d)
```

首先，通过 yield 定义生成器，生成器中可以有多个 yield 的地方，每次 yield 调用，都会有一次上下文切换，会将当前线程的控制权转交到外部代码中。

在生成器调用的时候，首先调用生成器函数 gen，其返回生成器，这个时候先运行 (a) 部分代码，用于生成器环境的初始化，(b) 第一次调用 yield，将 item 返回，上下文开始切换。

外部代码的 for 循环，会将生成器返回的 item 赋值给变量 i，然后运行示例代码中的 (d) 位置，之后进入下一次循环，这个时候上下文再次切换，切换到了生成器函数内部，开始运行 (c) 部分。

这样程序就结束了，因为这里代码只是简单没有循环，只会 yield 一次数据。对于生成器 yield 多次，其运行顺序的分析方式是一样的，主要理解上下文切换。

# yield 的增强功能

yield 本身带有的上下文切换能力，缺乏生成器和外部的通信功能，数据是单向的，只能生成器往外部 yield 数据，外部无法传数据给生成器。为此，Python 引入了 PEP 342，对 yield 的功能进行了增强。

```python
def consumer():
    while True:
        i = yield
        print i


def producer(c):
    while True:
        c.send('product')
        yield


if __name__ == '__main__':
    c = consumer()
    c.send(None)
    p = producer(c)
    p.next()
    p.next()
    p.next()
    p.next()
```

上面是一个非常简单的示例，生成器中的 yield 关键字可以返回数据了，返回的数据是靠 send 方法。

上面的代码有一点需要注意，就是 consumer 生成器初始化之后，第一次需要调用一下 c.send(None) 或者 c.next()，否则会报错：TypeError: can't send non-None value to a just-started generator。

yield 这种用法在 tornado 中大量被使用，使得异步的代码看起来和同步的很类似，使得异步编程得到了一定程度的简化。

# 参考文献

1. [Improve Your Python: 'yield' and Generators Explained](https://www.jeffknupp.com/blog/2013/04/07/improve-your-python-yield-and-generators-explained/)
2. [PEP 342](https://www.python.org/dev/peps/pep-0342/)
