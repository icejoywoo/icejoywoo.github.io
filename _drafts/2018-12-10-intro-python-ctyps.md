---
layout: post
title: Python ctypes 使用总结
category: python
tags: ['python', 'ctypes']
---

Python 调用 C/C++ 的程序主要有两种方式：

1. 使用 ctypes 调用动态库
2. 通过[Python C 扩展](2015-10-30-intro-of-extending-cpython.md)的方式

ctypes 的方式相对来说成本较低，首先 ctypes 是内置库，使用方便，使用的过程中与 C/C++ 动态库的逻辑是完全独立的，互相可以单独维护。但是相对也有明显的缺点，C++ 在编译后的函数名会变，ctypes 使用起来不方便，API 相对也比较繁琐，写起来略微麻烦一些，使用出错的话会导致进程退出。

本文主要介绍 ctypes 的基本用法，可以对现有的 C/C++ 代码进行简单的二次封装后进行使用。笔者认为 ctypes 本身还是比较适合轻量级的使用场景，如果逻辑较为复杂的，请考虑使用 C/C++ 扩展的方式。

本文的 Python 以 2.7 版本为例，编译使用 gcc。

# 简单示例

写一个简单的 Hello 来说明一下最基本的用法。首先定义一个简单的 c 函数。

```c
//hello_module.c
#include <stdio.h>

int hello(const char* name) {
    printf("hello %s!\n", name);
    return 0;
}
```

编译生成动态库，动态库不同的系统后缀不同（Windows 的 dll，Linux 的 so，Mac 的 dylib），需要注意，本文以 so 为例。

```bash
gcc -fPIC -shared hello_module.c -o hello_module.so
```

通过 ctypes 来进行动态库加载及函数调用，注意 windows 的调用方式有专有的 API。

```python
import ctypes

lib = ctypes.cdll.LoadLibrary("hello_module.so")

lib.hello("world")  # hello world!
```

以上便是简单的 ctypes 使用流程，加载动态库，然后就可以调用动态库中的函数。

有几点需要注意的地方：

1. 类型的隐私转换的，python 的 str 转换为了 c 的 const char*
2. 默认的函数返回值认为是 int，不为 int 的需要自行修改
3. 函数的参数类型未指定，只能使用 ctypes 自带的类型隐私转换

基础类型可以参考[官方文档的对应表格](https://docs.python.org/2/library/ctypes.html#fundamental-data-types)，需要额外说明的一点是，int 和 uint 都有对应的 8、16、32、64 的类型可供使用。

# 数组和指针类型

基本类型中只包含了 c_char_p 和 c_void_p 两个指针类型，其他的指针类型该如何使用？数组该如何定义和使用？我们来看看这两个类型的使用。

# 参考资料

1. [聊聊Python ctypes 模块](https://zhuanlan.zhihu.com/p/20152309)
2. [Interfacing Python and C: Advanced “ctypes” Features](https://dbader.org/blog/python-ctypes-tutorial-part-2)
3. [ctypes — A foreign function library for Python](https://docs.python.org/2/library/ctypes.html)