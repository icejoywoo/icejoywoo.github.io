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

编写一个为数组求和的函数。

```c
//sum_module.c
#include <stdio.h>

int sum(int a[], size_t len) {
    int ret = 0;
    for (size_t i = 0; i < len; i++) {
        ret += a[i];
    }
    return ret;
}

int sum2(int* a, size_t len) {
    int ret = 0;
    for (size_t i = 0; i < len; i++) {
        ret += a[i];
    }
    return ret;
}
```

和上面一样进行编译，生成动态库

```bash
gcc -fPIC -shared sum_module.c -o sum_module.so
```

像之前一样来使用，看下会怎样。

```python
import ctypes

lib = ctypes.cdll.LoadLibrary("sum_module.so")

lib.sum([1, 2, 3], 3)

#Traceback (most recent call last):
#  File "demo.py", line 7, in <module>
#    lib.sum([1, 2, 3], 3)
#ctypes.ArgumentError: argument 1: <type 'exceptions.TypeError'>: Don't know how to convert parameter 1
```

会发现 ctypes 报错了，不知道类型如何进行转换，也就是说 ctypes 的隐式转换是不支持数组类型的。

我们需要用 ctypes 的数组来传参数。

```python
import ctypes

lib = ctypes.cdll.LoadLibrary("sum_module.so")

array = (ctypes.c_int * 3)(1, 2, 3)
print lib.sum(array, len(array))

i = ctypes.c_int(5)
print lib.sum(i, 1)
```

ctypes 的数组定义就是用 ctypes 中的类型 * 大小。

下面我们看一下指针的用法。

```python
import ctypes

lib = ctypes.cdll.LoadLibrary("sum_module.so")

i = ctypes.c_int(5)
lib.sum2.argtypes = (ctypes.POINTER(ctypes.c_int), ctypes.c_size_t)
print lib.sum2(ctypes.pointer(i), 1)
```

POINTER 是用来定义指针类型，pointer 用来获取一个变量的指针，相当于 C 里面的 &。

pointer 的用法需要注意的是，必须在 ctypes 类型上使用，不能在 python 类型上使用。

```python
import ctypes

i = ctypes.c_int(5)
print ctypes.pointer(i)  # <__main__.LP_c_int object at 0x10566f7a0>

i = 5
print ctypes.pointer(i)  # TypeError: _type_ must have storage info
```

这就是数组和指针的基本使用方式，注意指针和数组的区分，这里定义的 sum 和 sum2 只是举例，sum2 第一个参数也可以接受数组，这个和在 C 里面是一样的。

# 函数参数类型和返回值类型

之前的例子只有一个明确指定了参数类型，没有指定返回类型。返回类型默认是 int，如果需要返回非 int 的类型就需要进行指定。

指定参数类型的好处在于，ctypes 可以处理指针的转换，无需代码中进行转换。

继续使用上一个 sum2 函数为例。

```python
i = ctypes.c_int(5)
lib.sum2.argtypes = (ctypes.POINTER(ctypes.c_int), ctypes.c_size_t)
print lib.sum2(ctypes.pointer(i), 1)
print lib.sum2(i, 1)
```

可以使用 pointer(i) 和 i 作为 sum2 的第一个参数，会自动处理是否为指针的情况。

# 结构体

结构体在 ctypes 需要进行类的定义，类型和指针的使用方式和之前一致。

下面我们看一个 struct 定义的实例。

```python
import ctypes

"""
typedef struct _user {
    int type;
    uint64_t  userid;
    char username[64];
    unsigned int created_at;
} user;
"""

class User(ctypes.Structure):
    _fields_ = [
        ('type', ctypes.c_int),
        ('userid', ctypes.c_uint64),
        ('username', ctypes.c_char * 64),
        ('created_at', ctypes.c_uint),
    ]


print ctypes.POINTER(User)  # <class '__main__.LP_User'>
u = User()
print ctypes.pointer(u)  # <__main__.LP_User object at 0x10982c7a0>
```

# 总结

ctypes 也支持联合体 union，但是因为不常用，所以本文没有提及。有需要的可以参考官方文档。

# 参考资料

1. [聊聊Python ctypes 模块](https://zhuanlan.zhihu.com/p/20152309)
2. [Interfacing Python and C: Advanced “ctypes” Features](https://dbader.org/blog/python-ctypes-tutorial-part-2)
3. [ctypes — A foreign function library for Python](https://docs.python.org/2/library/ctypes.html)