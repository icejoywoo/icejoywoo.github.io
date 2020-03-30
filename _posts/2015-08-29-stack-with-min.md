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

    assert s.pop() == 1
    assert s.min() == 3

    assert s.pop() == 5
    assert s.pop() == 4
    assert s.pop() == 3
    assert s.min() is None

```

我们可以分析出该方法的空间复杂度为O(n)，时间复杂度为O(1)。

最近发现了这个算法有一个空间复杂度O(1)，是通过stack存储差值而不是原始数据的方式来实现，这种方法获取元素的方法也需要进行还原，详细分析可以看[这里](https://www.cxyxiaowu.com/2968.html)，我这里的代码是根据最后一个方法来实现的。

```python
#!/bin/env python
# encoding: utf-8

class Stack(object):

    def __init__(self):
        self._stack = []
        self._min = None

    def push(self, element):
        if self._stack:
            r = element - self._min
            self._stack.append(element - self._min)
            self._min = element if r < 0 else self._min
        else:
            self._stack.append(0)
            self._min = element

    def pop(self):
        ret = None
        if self._stack:
            last = self._stack.pop()
            ret = self._min if last < 0 else self._min + last
            self._min = self._min - last if last < 0 else self._min

        if not self._stack:
            self._min = None

        return ret


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

    assert s.pop() == 1
    assert s.min() == 3

    assert s.pop() == 5
    assert s.pop() == 4
    assert s.pop() == 3
    assert s.min() is None

```

## 参考资料

1. [min stack](https://leetcode.com/problems/min-stack/)
2. [【被虐了】详解一次shopee面试算法题：最小栈的最优解](https://www.cxyxiaowu.com/2968.html)
