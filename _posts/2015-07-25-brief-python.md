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
## 字符串

在python的2.x中, 字符串有两种类型: str和unicode. 很多乱码问题都源于字符串有两个类型的问题,
解决的一般思路是python内部都采用unicode, str的编码都统一采用utf-8.

字符串的赋值方式

```python
a = "ab\tc"  # type: str
b = u"ab\tc"  # type: unicode
c = r"ab\tc"  # type: str,
d = '''This is a multi-line string.
This is the second line.'''  # '''和"""两种都可以, 多行字符串
```

字符串的一些操作

```python
a = 'abcdefghijk'
print a[1:3]  # 'bc'
print a[::-1]  # 字符串反转: 'kjihgfedcba'
print a.upper()  # 'ABCDEFGHIJK'
print a.lower()  # 'abcdefghijk'

# iterate
for c in a:
    print c

for i, c in enumerate(a):
    print i, c
```

{{ page.date | date_to_string }}
