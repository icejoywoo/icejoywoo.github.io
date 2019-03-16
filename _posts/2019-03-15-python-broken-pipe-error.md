---
layout: post
title: Python 的 Broken Pipe 错误问题分析 
category: python
tags: ['python', 'broken pipe']
---

本文是笔者重写了旧博客中的[Python的问题解决: IOError: [Errno 32] Broken pipe](https://www.cnblogs.com/icejoywoo/p/3908290.html)，并增加了一些更为深入的内容。

# 概述

我们在使用 Python 的过程中，偶尔会碰到这样的错误。

```bash
IOError: [Errno 32] Broken pipe
```

面对这类错误的时候，不知道该从何下手去解决，笔者就此问题进行简要分析，希望可以解决大家碰到的类似问题。

# 问题原因

这个 Broken pipe 本质是 IOError 错误，是 Linux 系统层面的机制导致，一般发生在读写文件IO和网络Socket IO的时候。

对应的 Linux 系统错误是 EPIPE，摘自【参考2】的一段话：

>Macro: int EPIPE
>“Broken pipe.” There is no process reading from the other end of a pipe. Every library function that returns this error code also generates a SIGPIPE signal; this signal terminates the program if not handled or blocked. Thus, your program will never actually see EPIPE unless it has handled or blocked SIGPIPE.

从这段话，我们可以知道这个错误是由系统 SIGPIPE 信号引起的，信号是 Linux 的一种进程间通信的机制，例如 ctrl+c 就会发送 SIGINT 信号来结束进程，或者使用 kill 命令。

```bash
$ kill <pid>
```

那么 SIGPIPE 信号是由什么来引发的呢？Linux 系统中还有个常见的 Pipe 管道机制，多个命令的组合就会使用到管道。

```bash
python <filename>.py | head
```

管道存在上游发送数据的进程，下游读取数据的进程，在下游不再需要读取上游数据的时候，就会发送 SIGPIPE 信号给上游进程。

什么时候会出现下游不再需要读取上游数据了呢？例如示例中的 head 命令，只需要读够足够的行数，就可以告诉上游我已经不需要再读取了，就会发送 SIGPIPE 信号给上游进程。

当这个上游进程是 Python 程序的时候，就会出现 IOError: [Errno 32] Broken pipe 这样的错误。

# 解决方法

一般来说，Broken Pipe 是可以忽略的，就是说忽略 SIGPIPE 信号即可。在 Python 中有两种方式可以实现。

```python
# 方法1：捕获异常

import sys, errno
try:
    ### IO operation ###
except IOError as e:
    if e.errno == errno.EPIPE:
        ### Handle error ###

# 方法2：忽略信号
from signal import signal, SIGPIPE, SIG_DFL, SIG_IGN
signal(SIGPIPE, SIG_IGN)

# 恢复默认信号行为的方法
# signal(SIGPIPE, SIG_DFL)
```

# 其他情况

笔者在实际中碰到过一种比较特殊的情况，大致记录在旧博客[Python的问题解决: IOError: [Errno 32] Broken pipe](https://www.cnblogs.com/icejoywoo/p/3908290.html)可以找到，这里重新整理简单描述如下。

## 现象

远程 ssh 到服务器上执行服务启动命令失败。

```bash
$ nohup python xxx.py > xxx.log &
```

报错信息为 IOError: [Errno 32] Broken pipe

## 定位

查看代码未发现明显异常，登录服务器后可以正常启动，没有错误。

通过 /proc 目录来查看远程启动的进程与本地启动的进程有何不同

```bash
$ ll /proc/<pid>/
```

最终发现在远程启动的进程中，发现了一个异常

```bash
$ ll /proc/<pid>/fd
...
/proc/<pid>/fd/2 -> broken pipe: [xxx]
...
```

我们知道 fd 2 就是指 stderr，stderr 是个 broken pipe，这个和错误基本吻合。

问题原因猜测：nohup 在本地执行的时候，会自动重定向 stderr 到 stdout 中，远程执行的时候重定向到了 pipe 上，在 ssh 连接断开后就出现了 broken pipe 错误。

## 解决

远程 ssh 到服务器执行的命令，增加了对 stderr 增加了重定向，发现可以避免该错误。

```bash
nohup python xxx.py > xxx.log 2> xxx.stderr.log &
```

# 参考

1. [IOError: [Errno 32] Broken pipe: Python](https://stackoverflow.com/questions/14207708/ioerror-errno-32-broken-pipe-python/30091579#30091579)
2. [Standard Unix signal](https://www.gnu.org/software/libc/manual/html_mono/libc.html#Error-Codes)