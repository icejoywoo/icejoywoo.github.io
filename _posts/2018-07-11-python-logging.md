---
layout: post
title: Python 日志配置总结
category: Python
tags: ['python', 'logging']
---

日志是程序调试的利器，通过日志来解析获取数据，线上问题通过日志分析和定位等，用途多种多样。Python 作为当前常用的一门开发语言，国内很多开发者对其的使用极其粗糙，写法较为随意，受开发者本身熟悉的语言有关，会参入较多其他语言的写法。

本文主要介绍下笔者在 Python 开发实践中总结的日志配置和使用方式，主要基于标准库 logging。

# 常见错误方式

首先，先说一下笔者在实践中碰到的一些不好的方式，及其不好的原因和临时修复方式。

## 使用 print 打印日志

最原始的最基本的方式就是使用 print 来打印，print 默认打印到 stdout 中，调试简单的代码逻辑没有问题，但是作为长期运行的服务，这种方式有比较明显的短板。

长期服务一般会重定向 stdout 及 stderr 到文件（可以是一个文件或者分开两个文件），这个时候在去调试服务，查看打印的信息的时候，发现很久没有看到打印的数据，这个如果不了解 stdout 本身有缓冲的话，会很难定位问题。需要注意在默认的 Python stdout 是带有 buffer 缓冲的（注意 stderr 是无缓冲的），打印一定数量的内容之后，才会 flush 内存到文件，会导致信息输出到文件不及时，无法及时看到打印的语句，这种对于服务问题定位和调试影响很大。

对于遗留的老服务，改进和解决的思路就是让输出更加及时，每次打印的语句都及时输出到文件即可。有两种方式可以实现：显示调用 flush 方法；禁用 Python 输出缓冲功能。需要根据具体情况来使用，一般禁用输出缓冲对现有代码入侵小，使用范围更广。

flush 调用示例

```python
import sys

print "test"
sys.stdout.flush()
```

禁用 Python 输出缓冲功能，设置环境变量 PYTHONUNBUFFERED 是最常用的方式，也可以使用 python -u 选项，对现有系统的侵入最小。

```bash
$ PYTHONUNBUFFERED=1 python <your_program>.py
```

## 封装 logging.logger 来打印日志

笔者在现实系统中，见过将 logging 再简单封装一层的方式，这样做并不是一种正确的使用 logging 的方式。

```python
import logging

def debug(msg):
    # do something
    logging.debug(msg)
    # do something

def info(msg):
    # do something
    logging.info(msg)
    # do something

def fatal(msg):
    # do something
    logging.fatal(msg)
    # do something
```

在打印日志的时候，需要加入一些额外的操作，例如可以统计一下各种日志的打印数量等。所以对 logging 简单封装一下来使用。

这种方式不好的地方在于，会破坏 logging 的配置，logging 打印日志的时候可以配置 lineno、filename、funcname 等产生日志的位置信息，但是简单封装后，这些信息都会指向简单封装的函数位置，为后续定位分析代码问题制造了很大的障碍。这种需求实现需要了解 logging 的机制，实现一个 handler 来进行处理。

# logging 配置参考

下面笔者就从最基本的实践开始，简单说下 logging 的基本配置。

```python
import logging
import logging.handlers

program_name = "<your_program_name>"
level = logging.DEBUG  # or logging.INFO for online

# 最好不要直接使用 logging 来打印日志
logger = logging.getLogger(program_name)
logger.setLevel(level)

format="%(levelname)s: %(asctime)s: %(filename)s:%(lineno)d * %(thread)d %(message)s"
date_format="%m-%d %H:%M:%S"
formatter = logging.Formatter(format, date_format)

# handler 保存日志到文件，logging 中带有多种实现，也可以自定义实现
# 每天 rotate 一次日志，保留 7 天日志
handler = logging.handlers.TimedRotatingFileHandler(
    "./log/%s.log" % program_name, interval=1, when='D', backupCount=7)
handler.setLevel(level)
handler.setFormatter(formatter)
logger.addHandler(handler)
```

上面是基本的 logger 初始化，可以开始基本的使用了。不过可能不够完美，下面我们进一步完善。

## 保证初始化一次

上面的代码，我们可以封装为一个初始化方法，然后在程序的多个地方调用，但是可能调用多次，这个初始化只需要执行一次即可。所以我们需要一种机制，初始化可以使用多次，但是实际上只初始化一次 logger。

初始化一次的方法可以有很多其他的实践，这里只提供一种对使用者负担较小的一种方式。

Python 3 因为支持了 nonlocal 关键词，所以更加简洁一些。

```python
# for python 3
def invoked_once(func):
    """ 确保方法只会被调用一次的装饰器
    """
    func.__called = False
    ret = None

    def wrapper(*args, **kargs):
        nonlocal ret
        print('func_name: %r, callled: %r,' % (func.__name__, func.__called), args, kargs)
        if func.__called:
            return ret
        else:
            func.__called = True
            ret = func(*args, **kargs)
            return ret
    return wrapper
```

Python 2 使用了一些 trick 来实现。

```python
def invoked_once(func):
    """ 确保方法只会被调用一次的装饰器
    """
    func.__called = False
    ret = [None]

    def wrapper(*args, **kargs):
        print('func_name: %r, callled: %r,' % (func.__name__, func.__called), args, kargs)
        if func.__called:
            return ret[0]
        else:
            func.__called = True
            ret[0] = func(*args, **kargs)
            return ret[0]
    return wrapper
```

关于上面代码的简单测试

```python
@invoked_once
def f():
    print("hello")
    return 10

for _ in range(10):
    print(f())
```

下面我们来稍微封装一下，即可完成只初始化一次的功能了。

```python

@invoked_once
def get_logger(program_name):
    # 参数列表根据需要进行添加，这里只是简单示例
    # 上面的初始化代码，这里省略...
    return logger

```

## 模块日志名

这样基本配置好了，可以比较好的在服务代码中使用了。一般来说，对各个模块有所区分也会比较好一些，使用不同的 logger name，也算是一种比较好的实践，logging 可以支持对不同的模块进行配置，更灵活一些。

```python
# 模块A
logger = get_logger("projectA.moduleA")

# 模块B
logger = get_logger("projectA.moduleB")

# 模块C
logger = get_logger("projectA.moduleC")
```

## 多进程打印日志问题

多进程打印日志的时候，RotatingFileHandler 是存在 bug 的，无法使用。

目前相对比较推荐的方式，是使用 WatchedFileHandler，然后 crontab 定时去修改日志名字，WatchedFileHandler 检测到文件名的文件改变会新建一个，变通地完成了日志滚动。

multiprocessing 模块中也有 [logging](https://docs.python.org/2/library/multiprocessing.html?highlight=multiprocessing#logging) 的方法的使用，可以阅读下文档这部分。

# 总结

本文介绍了笔者在开发实践中使用 logging 的经验，其实很多开源框架的日志打印都很值得我们去学习，想不通的时候看看别人怎么想的，怎么做的，模仿学习总结才能有自己的理解。

这里特别推荐一下 tornado 的 [log 模块](https://github.com/tornadoweb/tornado/blob/master/tornado/log.py)，tornado 日志打印在 console 中会带有颜色，非常直观好看，很值得学习，推荐阅读这个代码。
