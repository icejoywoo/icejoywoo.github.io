---
layout: post
title: 编写你自己的 Python C 扩展（Extending Python）
category: python
tags: ['python', 'CPython', 'extension']
---

# 前言

Python 是一门简单强大的编程语言，非常灵活，可以极大地提升程序员的编程效率。但是，Python 本身的灵活带来了运行效率低，内存占用相对较大的问题，这限制了 Python 在某些场景下的应用。

Python 的官方实现 CPython 本身提供了一个扩展机制，可以方便地编写扩展来提升效率，本文将通过一个示例来介绍 Python 的扩展编写基本方法。

本文使用的环境：Python 版本为 2.7，使用 C++ 编写，在 Linux 和 Mac 均可编译通过，Windows下未测试。

本文会使用一个常见的需求，实现 ip 转换为国家或城市的功能，主要介绍如何编写扩展函数和自定义新类型，与 Python 实现的版本在内存和性能上进行一些简单的对比。

本文的示例只要参考了官方文档，Python 的官方文档写得很详细，把文档当书来看就可以了。

本文的示例已经提前写好了一个 C++ 代码，可以完成 ip 到国家的转换，代码在[这里](https://github.com/icejoywoo/iputils/blob/master/ip_table.h)。主要是一个 IPLib 的类，提供了加载字典和获取国家的功能。

使用的ip库为[纯真ip库](http://www.cz88.net/)，经过了一些编码和格式处理，处理后的ip库在[dict/czip.txt](https://github.com/icejoywoo/iputils/blob/master/dict/czip.txt)，原始的ip库在[dict/cz88ip.txt](https://github.com/icejoywoo/iputils/blob/master/dict/cz88ip.txt)，

示例代码未经过充分测试，请不要使用在生产环境中。

本文的示例代码可以在 [github](https://github.com/icejoywoo/iputils) 上找到，与本文的示例有少许出入。

**如果您在阅读本文，发现任何问题，请留言指正，谢谢！**

# 编写扩展函数

先用一段测试代码来展示模块的几个函数及其基本用法。

```python
#!/bin/env python
# encoding: utf-8
# filename: test.py
import _iputils

# 加载字典
_iputils.load_dict("../dict/czip.txt")

# 通过ip查找国家
print _iputils.get_country("180.214.232.50")  # 印度尼西亚

# 清空内存中的字典数据，释放内存
_iputils.cleanup()
```

因为历史原因（不知道是什么历史原因，文档上这么说的），扩展的代码文件命名有个约定：如果扩展名为 iputils，那么文件名就为 iputilsmodule.c，如果文件名过长，那么就叫 iputils.c。当然对于 C++ 来说就是改个文件后缀。

创建一个 iputilsmodule.cpp 的文件，然后开始写 Python 扩展了。首先引入 Python 的头文件。

```cpp
# include "Python.h"
```

*说明：系统头文件用 <>，对于其他头文件用 ""，文档中使用了 <>，笔者认为这里使用 "" 更为合适。*

**注意：文档中有提示，Python.h 需要在其他标准头文件之前引入，原文如下。**

>Note Since Python may define some pre-processor definitions which affect the standard headers on some systems, you must include Python.h before any standard headers are included.

Python 提供的函数和宏等都是Py或PY开头的，此外还包含几个标准库的头文件：\<stdio.h\>、\<string.h\>、\<errno.h\> 和 \<stdlib.h\>。

因为现有的 C++ 代码中是一个类封装了几个方法，所以首先初始化一个全局的对象。

```cpp
// 引入其他头文件
# include <string>
# include "ip_table.h"

// 全局IPLib
static IPLib ip_lib;
```

下面我们来封装加载字典的函数，开始学习一些基本的 Python C API。

```cpp
static PyObject* load_dict_function(PyObject *self, PyObject *args) {
    PyObject* dict_path = NULL;
    if (!PyArg_ParseTuple(args, "O", &dict_path)) {
        return NULL;
    }

    if (!PyString_Check(dict_path)) {
        PyErr_SetString(PyExc_TypeError,
                        "The dict path must be a string");
        return NULL;
    }

    char* _dict_path = PyString_AsString(dict_path);
    ip_lib.LoadDict(_dict_path);

    Py_INCREF(Py_True);
    return Py_True;
}
```

这段代码有两个重要的点需要说明：

1. 函数参数形式有三种：无参数，带 args 参数的，带 args 和 kwargs 参数的。形式是这样的static PyObject* \<func_name\>(PyObject* self[, PyObject* args[, PyObject* kwds])，这个和 Python 的函数是一样的，可以通过 [PyArg\_ParseTuple](https://docs.python.org/2/c-api/arg.html#c.PyArg_ParseTuple)和 [PyArg\_ParseTupleAndKeywords](https://docs.python.org/2/c-api/arg.html#c.PyArg_ParseTupleAndKeywords) 两个函数进行解析。
2. 引用计数的宏：针对 PyObject* 类型的，某些函数的返回值或输出值，是不需要进行计数操作的，例如 [PyArg\_ParseTuple](https://docs.python.org/2/c-api/arg.html#c.PyArg_ParseTuple) 获取的参数中如果有 PyObject*，是不需要进行计数减一的（即，调用 Py_DECREF）。

代码中的其他函数的说明：

1. PyString_* 是 PyStringObject 的方法，PyString\_Check 是一个类型检查操作，PyString\_AsString 是将 PyObject*  转换为 char*，可以通过阅读[文档](https://docs.python.org/2/c-api/string.html)来了解更多。
2. PyErr_SetString 是 Exception 和 Error相关的部分，PyErr\_SetString 是设置异常信息，return NULL 来表明函数有异常，通过[文档](https://docs.python.org/2/extending/extending.html#intermezzo-errors-and-exceptions)来了解更多。

接下来我们来编写另外两个函数：

```cpp
static PyObject* get_country_function(PyObject *self, PyObject *args) {
    PyObject* ip = NULL;
    if (!PyArg_ParseTuple(args, "O", &ip)) {
        return NULL;
    }

    if (!PyString_Check(ip)) {
        PyErr_SetString(PyExc_TypeError,
                        "The ip must be a string");
        return NULL;
    }

    std::string country;
    const char* _ip = PyString_AsString(ip);
    ip_lib.GetCountry(_ip, country);

    if (country.empty()) {
        Py_INCREF(Py_None);
        return Py_None;
    } else {
        return Py_BuildValue("s", country.c_str());
    }
}

static PyObject* cleanup_function(PyObject *self) {
    ip_lib.CleanUp();
    Py_INCREF(Py_True);
    return Py_True;
}
```

这里有一个函数需要注意下：[Py_BuildValue](https://docs.python.org/2/c-api/arg.html#c.Py_BuildValue)，这个用来将 C/C++ 原生的类型转换为 PyObject 类型。

最后，初始化模块。

```cpp
static PyMethodDef module_methods[] = {
    {"load_dict", (PyCFunction)load_dict_function, METH_VARARGS, "load dict to memory"},
    {"get_country", (PyCFunction)get_country_function, METH_VARARGS, "get country by ip"},
    {"cleanup", (PyCFunction)cleanup_function, METH_NOARGS, "cleanup memory"},
    {NULL, NULL, 0, NULL}
};

PyMODINIT_FUNC init_iputils(void) {
    Py_InitModule3("_iputils", module_methods, "ip utils");
}
```

[PyMethodDef](https://docs.python.org/2/c-api/structures.html?highlight=pymethoddef#c.PyMethodDef) 是一个描述方法定义的结构体，包含四个参数：函数名，在 Python 中使用的名字；C 函数；flag，常见的有：METH_NOARGS 表示没有参数，METH_VARARGS 表示带有参数，METH_KEYWORDS 表示带有 keyword 的参数；docstring，在 Python 中看到的帮助信息。

初始化 module 的方法有三个：[Py_InitModule](https://docs.python.org/2/c-api/allocation.html?highlight=py_initmodule#c.Py_InitModule)、[Py_InitModule3](https://docs.python.org/2/c-api/allocation.html?highlight=py_initmodule#c.Py_InitModule3)、[Py_InitModule4](https://docs.python.org/2/c-api/allocation.html?highlight=py_initmodule#c.Py_InitModule4)，输入参数有所不同，3 和 4 表示有几个输入参数。

至此，C++ 扩展就基本完成了，下面通过 setuptools 来进行编译。创建一个 setup.py 的文件。

```python
# filename: setup.py
from setuptools import setup, Extension

iputils = Extension('_iputils', sources=["iputilsmodule.cpp"])
setup(ext_modules=[iputils])
```

在命令行中运行

```bash
$ python setup.py build
running build
running build_ext
building '_iputils' extension
creating build
creating build/temp.macosx-10.10-x86_64-2.7
clang -fno-strict-aliasing -fno-common -dynamic -I/usr/local/include -I/usr/local/opt/sqlite/include -DNDEBUG -g -fwrapv -O3 -Wall -Wstrict-prototypes -I/usr/local/Cellar/python/2.7.9/Frameworks/Python.framework/Versions/2.7/include/python2.7 -c iputilsmodule.cpp -o build/temp.macosx-10.10-x86_64-2.7/iputilsmodule.o
creating build/lib.macosx-10.10-x86_64-2.7
clang++ -bundle -undefined dynamic_lookup -L/usr/local/lib -L/usr/local/opt/sqlite/lib build/temp.macosx-10.10-x86_64-2.7/iputilsmodule.o -o build/lib.macosx-10.10-x86_64-2.7/_iputils.so
```

运行 install 可以进行安装，或者把动态库拷贝到当前目录

```bash
$ cp build/lib.macosx-10.10-x86_64-2.7/_iputils.so .
```

运行测试代码

```bash
$ python test.py
印度尼西亚
```

一个模块的编写、编译、使用的基本流程跑完了。

## C/C++ 原生类型和 PyObject 的转换

这里主要涉及三个函数，两个（[PyArg_ParseTuple](https://docs.python.org/2/c-api/arg.html#c.PyArg_ParseTuple) 和 [PyArg_ParseTupleAndKeywords](https://docs.python.org/2/c-api/arg.html#c.PyArg_ParseTupleAndKeywords)）用来将 PyObject Tuple 转换为 C/C++ 原生类型，[Py_BuildValue](https://docs.python.org/2/c-api/arg.html#c.Py_BuildValue) 是用来将 C/C++ 原生类型转换为 PyObject。

前两个用于解析函数输入的 PyObject，最后一个用于返回 PyObject，是非常重要的几个函数。这部分可以通过文档，快速掌握基本用法。

**注意：这三个函数都不需要关注引用计数，不要调用 Py_INCREF 和 Py_DECREF，注意代码示例。**

相关文档都 [Extending Python with C or C++](https://docs.python.org/2/extending/extending.html) 和 [Parsing arguments and building values](https://docs.python.org/2/c-api/arg.html)，后者是函数 API 文档。

推荐先阅读下面几个部分：

1. [Extracting Parameters in Extension Functions](https://docs.python.org/2/extending/extending.html#extracting-parameters-in-extension-functions)
2. [Keyword Parameters for Extension Functions](https://docs.python.org/2/extending/extending.html#keyword-parameters-for-extension-functions)
3. [Building Arbitrary Values](https://docs.python.org/2/extending/extending.html#building-arbitrary-values)

摘抄部分文档中的示例，这些示例可以快速了解基本用法，加入了少量注释。

PyArg_ParseTuple 用法示例。

```cpp
int ok;
int i, j;
long k, l;
const char *s;
int size;

ok = PyArg_ParseTuple(args, ""); /* No arguments */
    /* Python call: f() */

ok = PyArg_ParseTuple(args, "s", &s); /* A string */
    /* Possible Python call: f('whoops!') */

ok = PyArg_ParseTuple(args, "lls", &k, &l, &s); /* Two longs and a string */
    /* Possible Python call: f(1, 2, 'three') */

ok = PyArg_ParseTuple(args, "(ii)s#", &i, &j, &s, &size);
    /* A pair of ints and a string, whose size is also returned */
    /* Possible Python call: f((1, 2), 'three') */

{
    const char *file;
    const char *mode = "r";
    int bufsize = 0;
    // | 表示后面的参数是可选的
    ok = PyArg_ParseTuple(args, "s|si", &file, &mode, &bufsize);
    /* A string, and optionally another string and an integer */
    /* Possible Python calls:
       f('spam')
       f('spam', 'w')
       f('spam', 'wb', 100000) */
}

{
    int left, top, right, bottom, h, v;
    ok = PyArg_ParseTuple(args, "((ii)(ii))(ii)",
             &left, &top, &right, &bottom, &h, &v);
    /* A rectangle and a point */
    /* Possible Python call:
       f(((0, 0), (400, 300)), (10, 10)) */
}

{
    Py_complex c;
    // : 之后是一个函数名字，用来错误信息提示用的
    ok = PyArg_ParseTuple(args, "D:myfunction", &c);
    /* a complex, also providing a function name for errors */
    /* Possible Python call: myfunction(1+2j) */
}
```

PyArg_ParseTupleAndKeywords 需要注意 PyMethodDef 的 flag 部分是 METH_VARARGS | METH_KEYWORDS。

```cpp
#include "Python.h"

static PyObject *
keywdarg_parrot(PyObject *self, PyObject *args, PyObject *keywds)
{
    int voltage;
    char *state = "a stiff";
    char *action = "voom";
    char *type = "Norwegian Blue";

    static char *kwlist[] = {"voltage", "state", "action", "type", NULL};

    if (!PyArg_ParseTupleAndKeywords(args, keywds, "i|sss", kwlist,
                                     &voltage, &state, &action, &type))
        // | 表示后面的参数是可选的
        return NULL;

    printf("-- This parrot wouldn't %s if you put %i Volts through it.\n",
           action, voltage);
    printf("-- Lovely plumage, the %s -- It's %s!\n", type, state);

    Py_INCREF(Py_None);

    return Py_None;
}

static PyMethodDef keywdarg_methods[] = {
    /* The cast of the function is necessary since PyCFunction values
     * only take two PyObject* parameters, and keywdarg_parrot() takes
     * three.
     */
    {"parrot", (PyCFunction)keywdarg_parrot, METH_VARARGS | METH_KEYWORDS,
     "Print a lovely skit to standard output."},
    {NULL, NULL, 0, NULL}   /* sentinel */
};

void
initkeywdarg(void)
{
  /* Create the module and add the functions */
  Py_InitModule("keywdarg", keywdarg_methods);
}
```

Py_BuildValue 和 Python 类型对照

```cpp
Py_BuildValue("")                        None
Py_BuildValue("i", 123)                  123
Py_BuildValue("iii", 123, 456, 789)      (123, 456, 789)
Py_BuildValue("s", "hello")              'hello'
Py_BuildValue("ss", "hello", "world")    ('hello', 'world')
Py_BuildValue("s#", "hello", 4)          'hell'
Py_BuildValue("()")                      ()
Py_BuildValue("(i)", 123)                (123,)
Py_BuildValue("(ii)", 123, 456)          (123, 456)
Py_BuildValue("(i,i)", 123, 456)         (123, 456)
Py_BuildValue("[i,i]", 123, 456)         [123, 456]
Py_BuildValue("{s:i,s:i}",
              "abc", 123, "def", 456)    {'abc': 123, 'def': 456}
Py_BuildValue("((ii)(ii)) (ii)",
              1, 2, 3, 4, 5, 6)          (((1, 2), (3, 4)), (5, 6))
```

我们可以发现，之前的输入参数处理部分是不够简洁的，可以修改一下。

```cpp
static PyObject* load_dict_function(PyObject *self, PyObject *args) {
    const char* dict_path = NULL;
    if (!PyArg_ParseTuple(args, "s", &dict_path)) {
        return NULL;
    }

    ip_lib.LoadDict(dict_path);

    Py_INCREF(Py_True);
    return Py_True;
}

static PyObject* get_country_function(PyObject *self, PyObject *args) {
    const char* ip = NULL;
    if (!PyArg_ParseTuple(args, "s", &ip)) {
        return NULL;
    }

    std::string country;
    ip_lib.GetCountry(ip, country);

    if (country.empty()) {
        Py_INCREF(Py_None);
        return Py_None;
    } else {
        return Py_BuildValue("s", country.c_str());
    }
}
```

本部分的完整代码在[module_version](https://github.com/icejoywoo/iputils/tree/master/module_version)。

# 自定义新类型

自定义新类型的含义是，使用 C/C++ 扩展来编写一个类。基本功能示例

```python
# filename: test.py
import _iputils

ip = _iputils.IP2Location("../dict/czip.txt")
print ip.get_country("180.214.232.50")


def parse(line):
    fields = line.split()
    return tuple(fields[:3])

# 自定义字典的数据解析方式，针对不同格式的处理
ip = _iputils.IP2Location("../dict/cz88ip.txt", parse)
print ip.get_country("180.214.232.50")
```

这里的头文件需要比之前多引入一个

```cpp
#include "structmember.h"
```

主要提供了一些类属性相关的操作。

首先，自定义一个类型

```cpp
typedef struct {
    PyObject_HEAD
    IPLib* ip_lib;
} IP2Location;
```

这同样是一个 PyObject 的子类型，任何 Python 的类型都必须是 PyObject 的子类型。

有了类型之后，要创建和删除对象，有内存相关的操作。

```cpp
static void
IP2Location_dealloc(IP2Location* self) {
    delete self->ip_lib;
    self->ob_type->tp_free((PyObject*)self);
}

static PyObject*
IP2Location_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    IP2Location* self;
    self = (IP2Location *)type->tp_alloc(type, 0);
    self->ip_lib = new IPLib();
    return (PyObject*) self;
}
```

函数命名采用了 \<type\>\_funcname 的形式，是一种约定的方式，可以提升代码可读性。new 是用来创建对象的，相当于\_\_new\_\_，分配内存，dealloc 是用来回收内存的。

下面需要有构造函数，相当于\_\_init\_\_

```cpp
static int
IP2Location_init(IP2Location* self, PyObject* args, PyObject* kwds) {
    const char* dict_path = NULL;
    PyObject* callback = NULL;

    static char* kwlist[] = {"dict_path", "callback", NULL};

    if (!PyArg_ParseTupleAndKeywords(args, kwds, "s|O", kwlist, &dict_path, &callback)) {
        return -1;
    }

    if (callback) {
        if (!PyCallable_Check(callback)) {
            PyErr_SetString(PyExc_TypeError,
                            "The callback must be a function");
            return -1;
        }
        FILE* f = fopen(dict_path, "r");
        char buf[1024];
        PyObject* arglist;
        PyObject* result;

        const char* start;
        const char* end;
        const char* country;
        while (fgets(buf, sizeof(buf), f)) {
            arglist = Py_BuildValue("(s)", buf);
            result = PyObject_CallObject(callback, arglist);
            Py_DECREF(arglist);
            if (PyArg_ParseTuple(result, "sss", &start, &end, &country)) {
                self->ip_lib->PushItem(start, end, country);
            }
            Py_DECREF(result);
        }
    } else {
        self->ip_lib->LoadDict(dict_path);
    }

    return 0;
}
```

这里引入了一个可选参数，是一个回调函数，用于自定义的解析。

[在 C/C++ 中调用 Python 函数](https://docs.python.org/2/extending/extending.html#calling-python-functions-from-c)是非常容易的，使用 PyCallable_Check 来检查类型，通过 PyObject_CallObject 就可以完成调用，返回 NULL 表示失败。

**注意：Py_BuildValue 和 PyObject_CallObject 返回的指针要 Py_DECREF，否则会内存泄漏。**

定义类的两个方法

```cpp
static PyObject *
IP2Location_get_country(IP2Location* self, PyObject* args)
{
    const char* ip;

    if (!PyArg_ParseTuple(args, "s", &ip)) {
        return NULL;
    }

    std::string country;
    self->ip_lib->GetCountry(ip, country);

    if (country.empty()) {
        Py_INCREF(Py_None);
        return Py_None;
    } else {
        return Py_BuildValue("s", country.c_str());
    }
}

static PyObject *
IP2Location_cleanup(IP2Location* self)
{
    self->ip_lib->CleanUp();
    Py_INCREF(Py_True);
    return Py_True;
}
```

定义 PyTypeObject

```cpp
// 定义成员
static PyMemberDef IP2Location_members[] = {
    {NULL}  /* Sentinel */
};

// 定义属性的getter和setter
static PyGetSetDef IP2Location_getseters[] = {
    {NULL} /* Sentinel */
};

static PyMethodDef IP2Location_methods[] = {
    {"get_country", (PyCFunction)IP2Location_get_country, METH_VARARGS, "get country by ip"},
    {"cleanup", (PyCFunction)IP2Location_cleanup, METH_NOARGS, "cleanup"},
    {NULL}  /* Sentinel */
};

static PyTypeObject IP2LocationType = {
    PyObject_HEAD_INIT(NULL)
    0,                                        /*ob_size*/
    "_iputils.IP2Location",                   /*tp_name*/
    sizeof(IP2Location),                      /*tp_basicsize*/
    0,                                        /*tp_itemsize*/
    (destructor)IP2Location_dealloc,          /*tp_dealloc*/
    0,                                        /*tp_print*/
    0,                                        /*tp_getattr*/
    0,                                        /*tp_setattr*/
    0,                                        /*tp_compare*/
    0,                                        /*tp_repr*/
    0,                                        /*tp_as_number*/
    0,                                        /*tp_as_sequence*/
    0,                                        /*tp_as_mapping*/
    0,                                        /*tp_hash */
    0,                                        /*tp_call*/
    0,                                        /*tp_str*/
    0,                                        /*tp_getattro*/
    0,                                        /*tp_setattro*/
    0,                                        /*tp_as_buffer*/
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE, /*tp_flags*/
    "IP2Location objects",                    /* tp_doc */
    0,                                        /* tp_traverse */
    0,                                        /* tp_clear */
    0,                                        /* tp_richcompare */
    0,                                        /* tp_weaklistoffset */
    0,                                        /* tp_iter */
    0,                                        /* tp_iternext */
    IP2Location_methods,                      /* tp_methods */
    IP2Location_members,                      /* tp_members */
    IP2Location_getseters,                    /* tp_getset */
    0,                                        /* tp_base */
    0,                                        /* tp_dict */
    0,                                        /* tp_descr_get */
    0,                                        /* tp_descr_set */
    0,                                        /* tp_dictoffset */
    (initproc)IP2Location_init,               /* tp_init */
    0,                                        /* tp_alloc */
    IP2Location_new,                          /* tp_new */
};
```

最后初始化模块

```cpp
static PyMethodDef module_methods[] = {
    {NULL, NULL, 0, NULL}
};

PyMODINIT_FUNC init_iputils(void) {
    PyObject* m;
    if (PyType_Ready(&IP2LocationType) < 0) {
        return;
    }

    m = Py_InitModule3("_iputils", module_methods, "ip utils");
    if (m == NULL) {
        return;
    }
    PyModule_AddObject(m, "IP2Location", (PyObject*)&IP2LocationType);
}
```

**注意：PyType_Ready 一定要调用，否则会导致莫名其妙的 core。**

编译和测试方法与模块扩展相同，不再赘述。

本部分代码在[newtype_version](https://github.com/icejoywoo/iputils/tree/master/newtype_version)上可以找到。

# 性能对比

纯 Python 的实现（[py_version](https://github.com/icejoywoo/iputils/tree/master/py_version/iputils.py)），比较 C/C++ 扩展和纯 Python 代码的性能差异。

```
load dict perf:
c ext load dict: 8.6370/10 s
c ext load dict with user-defined parse: 14.4615/10 s
py load dict: 52.7173/10 s
py load dict with user-defined parse: 55.2053/10 s

query perf:
c ext query: 0.9968/1000000 s
c ext query(load dict with user-defined parse): 0.9875/1000000 s
py query: 18.1608/1000000 s
py query(load dict with user-defined parse): 18.3461/1000000 s
```

我们可以看出字典加载速度大概 C++ 扩展大概比纯 Python 快了 6 倍多，查询快了18倍。内存占用方面，C++ 扩展大约占用 41M 左右，纯 Python 大约占用 90M 左右。

在使用纯 Python 的实现下，比较 CPython 和 Pypy 的性能差异，Pypy 不支持 C/C++ 扩展。

```
load dict perf:
py load dict: 9.0626/10 s
py load dict with user-defined parse: 9.6801/10 s

query perf:
py query: 1.2138/1000000 s
py query(load dict with user-defined parse): 1.2110/1000000 s
```

我们可以对比发现，Pypy 本身（PyPy 2.5.1）的性能还是十分不错的，非常接近 C++ 扩展的性能，内存大约占用 153M 左右，内存占用较大。

**内存占用这里都只是运行加载字典后的情况，未测试在大量查询之后的内存情况，内存情况只是参考，可能不同环境不同版本的内存占用有不同。**

# 参考

主要参考了 Python 的文档，Python 文档全面权威，是非常好的学习材料。

1. [Extending Python with C or C++](https://docs.python.org/2/extending/extending.html)
2. [Defining New Types](https://docs.python.org/2/extending/newtypes.html)
3. [Parsing arguments and building values](https://docs.python.org/2/c-api/arg.html)
4. 扩展阅读材料：[Python Extension Patterns](http://pythonextensionpatterns.readthedocs.io/en/latest/refcount.html)
