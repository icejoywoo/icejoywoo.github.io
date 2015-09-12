---
layout: post
title: 带有min函数的Stack实现
category: algorithm
tags: ['algorithm']
---

Stack是一种常见的数据结构，是一种后进先出（LIFO，Last In First Out）的结构。

问题描述：实现一个栈，满足min()、pop()、push()方法的时间复杂度都为O(1)。（其中min返回栈中最小元素）

思路分析：

这道题要求三个函数的时间复杂度为O(1)，pop和push时间度为O(1)是很容易做到的，min如果是蛮力法的话，
遍历一遍stack寻找最小值，时间复杂度为O(n)。

用空间换取时间的方式，Stack的每个element不止包含一个element，而是包含element和当前element作为栈顶时的最小值min，同时stack中包含一个当前状态的最小值\_min和一个\_stack。

1. push操作的时候，push进来一个element，与\_min进行比较，更新\_min，并且把(element, \_min)都放入\_stack中
1. pop操作的时候，pop出一个element，将\_min更新为pop完之后的栈顶元素(element, min)中的min，返回之前pop出来的element
1. min就直接返回\_min

测试case：

1. stack的基本功能，保证LIFO
1. stack为空的时候，min的返回
1. stack在push一些数据之后，min的返回
1. stack在push一些数据再pop几个数据之后，min的返回
1. stack在push一些数据再pop为空后，min的返回

完整python的实现如下

```python
#!/bin/env python
# encoding: utf-8

__author__ = 'icejoywoo'


class Stack(object):

    def __init__(self):
        self._stack = []
        self._min = None

    def push(self, element):
        if self._min and element < self._min:
            self._min = element
        elif self._min is None:
            self._min = element
        self._stack.append((element, self._min))

    def pop(self):
        last, _ = self._stack.pop()
        if self._stack:
            self._min = self._stack[-1][1]
        else:
            self._min = None
        return last

    def min(self):
        return self._min

    def __len__(self):
        return len(self._stack)


if __name__ == '__main__':

    s = Stack()

    assert s.min() is None

    s.push(3)
    assert s.min() == 3
    s.push(4)
    assert s.min() == 3
    s.push(5)
    assert s.min() == 3

    s.push(1)
    assert s.min() == 1

    s.pop()
    assert s.min() == 3

    s.pop()
    s.pop()
    s.pop()
    assert s.min() is None

```
