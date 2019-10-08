---
layout: post
title: 斐波那契数列胡扯（Python篇）
category: algorithm
tags: ['algorithm', 'fibonacci']
---

本文主要是通过斐波那契来引入问题，开始逐步分析递归的解法缺点，使用缓存和尾递归进行优化，最后将尾递归展开为循环迭代逻辑，通过这个思路来加深对递归的理解。

本文主要用Python 2.7为例，讲解斐波那契的多种解法和思路。

## 斐波那契数列

这个数列大家都不陌生，是一个非常经典的数列，前两项均为1（也可以为0、1），然后每一项是前两项之和。递归定义如下所示：

```bash
f(0) = f(1) = 1
f(n) = f(n-1) + f(n-2) # when n > 1
```

那斐波那契数列的实现有很多种，最容易想到的就是递归，下面我们从递归讲起。

## 递归

递归的代码非常简单，根据定义就可以很容易写出。

```python
def fib_recursive(n):
    """ 递归实现的fib数列
    """
    # recursive terminator
    if n in (0, 1):
        return 1
    else:
        # process
        return fib_recursive(n-1) + fib_recursive(n-2)
```

不过递归方法有个非常大的问题就是，重复计算的次数太多。以fib(5)为例：

```bash
                           fib(5)   
                     /                \
               fib(4)                fib(3)   
             /        \              /       \ 
         fib(3)      fib(2)         fib(2)   fib(1)
        /    \       /    \        /      \
  fib(2)   fib(1)  fib(1) fib(0) fib(1) fib(0)
  /     \
fib(1) fib(0)
```

我们可以看到多个数值均有重复计算，而且栈的深度也和n有关，这就导致了效率低和栈溢出（stack overflow）两个问题。

## 带有缓存的递归

在工程上碰到这类的问题，其实有个很容易想到的思路就是加缓存，这样可以大量减少重复的计算，提升效率，不过这个仍然无法解决栈溢出的问题。

```python
def fib_recursive_with_cache(n, cache={}):
    """ 带有缓存的递归实现的fib数列
    """
    # recursive terminator
    if n in (0, 1):
        return 1

    # process
    if n - 1 not in cache:
        cache[n - 1] = fib_recursive_with_cache(n - 1)

    a = cache[n - 1]

    if n - 2 not in cache:
        cache[n - 2] = fib_recursive_with_cache(n - 2)

    b = cache[n - 2]
    return a + b
```

说明：上面带有缓存的代码实现仅仅做示例，现实中最好不要在函数参数中使用dict或list来做参数默认值，这个初始化操作只会进行一次，所以可以在这里作为函数返回值的缓存，和定义一个全局缓存的作用相同。

## 尾递归

对于递归来说，有一种特殊的形式是可以通过编译器来转化为循环的方式，这样对于栈的使用深度就变成了常数1，与循环迭代的逻辑等价。这个是函数式编程中非常常用的一种方式，用来替代循环。

不过这个是需要编译器支持，遗憾的是Python并不支持尾递归。这里给出实现代码，因为Python不支持尾递归优化，所以这个还是有栈溢出的问题。

```python
def fib_tail_recursive(n):
    """ 尾递归实现的fib数列
    """
    def _f(n, a, b):
        # recursive terminator
        if n in (0, 1):
            return b

        # process
        return _f(n-1, b, a+b)

    return _f(n, 1, 1)
```

尾递归的主要形式，是需要所有的返回都是函数自身，这就需要将状态保存在参数列表中。我们根据斐波那契的定义来看，需要前两个数来进行计算，所以我们的函数参数列表就需要增加额外的两个状态参数。

这里提供一个 Scala 的实现版本，可以通过计算fib(100)来查看二者的速度差异，tailrec的速度非常快，而递归的实现会非常慢。

```scala
import scala.annotation.tailrec

def fib_tailrec(n: Long): Long = {
  @tailrec
  def f(n: Long, a: Long, b: Long): Long = {
    if (n == 0) {
      a
    } else {
      f(n-1, b, a+b)
    }
  }
  f(n, 1, 1)
}
def fib(n: Long): Long = {
  if (n == 0 || n == 1) {
    1
  } else {
    fib(n-1) + fib(n-2)
  }
}
```

这里使用了tailrec注解，这样在函数实现为非尾递归的时候会报错。

## 循环迭代

既然Python不支持尾递归优化，我们就手动改写为循环迭代的代码即可。

```python
def fib_iterate(n):
    """ 迭代实现的fib
    """
    if n <= 1:
        return 1

    f = [1, 1] + [0] * (n-1)

    for i in xrange(2, n+1):
        f[i] = f[i-1] + f[i-2]

    return f[n]
```

通过开辟一个数组，初始化前两项为1，然后进行循环迭代计算即可，但让也可以初始化为dict。这样空间复杂度就变成O(n)了，我们的尾递归只需要两个变量，所以这里也可以再改写为两个变量，重复使用即可。

```python
def fib_iterate(n):
    """ 迭代实现的fib
    """
    if n <= 1:
        return 1

    a, b = 1, 1

    for i in xrange(2, n+1):
        a, b = b, a+b

    return b
```

这个其实就和尾递归被识别后优化的代码逻辑是一致的，相当于手动尾递归优化。

## 总结

这里给出的解法依然是常规的思路解法，从递归到尾递归，再到迭代方法，其实这些方法都是相互关联的，可以一步一步地深入。这里的最快算法是O(n)的时间复杂度，不过斐波那契数列有一种通过公式计算的方法可以做到O(log(n))的时间复杂度。可以阅读参考资料来进一步学习。

## 参考资料

1. [Program for Fibonacci numbers](https://www.geeksforgeeks.org/program-for-nth-fibonacci-number/)
2. [拜托，面试别再问我斐波那契数列了！！！](https://mp.weixin.qq.com/s?__biz=MjM5ODYxMDA5OQ==&mid=2651961606&idx=1&sn=0ad1a2eec0c2a0187034c258ef63fab2&chksm=bd2d0cda8a5a85cc1cee07fca7d877a79d7146aac5021c55340a8b6ae595942319d496d51806&scene=21#wechat_redirect)