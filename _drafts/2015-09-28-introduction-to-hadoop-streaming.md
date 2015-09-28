---
layout: post
title: Hadoop Streaming入门
category: hadoop
tags: ['hadoop', 'streaming']
---

说明：本文使用的Hadoop版本是2.6.0。

# 概述

Hadoop Streaming是Hadoop提供的一种编程工具，提供了一种非常灵活的编程接口，
允许用户使用任何语言编写MapReduce作业，是一种常用的非Java API编写MapReduce的工具。

调用Streaming的命令如下（hadoop-streaming-x.x.jar不同版本的位置不同）：

```bash
$ ${HADOOP_HOME}/bin/hadoop jar ${HADOOP_HOME}/share/hadoop/tools/lib/hadoop-streaming-2.6.0.jar \
    -input <输入目录> \
    -inputformat <输入格式 JavaClassName> \
    -output <输出目录> \
    -outputformat <输出格式 JavaClassName> \
    -mapper <mapper executable or JavaClassName> \
    -reducer <reducer executable or JavaClassName> \
    -combiner <combiner executable or JavaClassName> \
    -partitioner <JavaClassName> \
    -cmdenv <name=value> \ # 可以传递环境变量，可以当作参数传入到任务中，可以配置多个
    -file <依赖的文件> \ # 配置文件，字典等依赖
    -D <name=value> \ # 作业的属性配置
```

## 常见的作业属性

|                 属性                 |                 含义                 |             备注            |
|:------------------------------------:|:------------------------------------:|:---------------------------:|
| mapred.map.tasks                     | 每个Job运行map task的数量            | map启动的个数无法被完全控制 |
| mapred.reduce.tasks                  | 每个Job运行reduce task的数量         |                             |
| stream.map.input.field.separator     | Map输入数据的分隔符                  | 默认是\t                    |
| stream.reduce.input.field.separator  | Reduce输入数据的分隔符               | 默认是\t                    |
| stream.map.output.field.separator    | Map输出数据的分隔符                  | 默认是\t                    |
| stream.reduce.output.field.separator | Reduce输出数据的分隔符               |                             |
| stream.num.map.output.key.fields     | Map task输出record中key所占的个数    |                             |
| stream.num.reduce.output.key.fields  | Reduce task输出record中key所占的个数 |                             |

*注意：2.6.0的Streaming文档中只提到了stream.num.reduce.output.fields，
没提到stream.num.reduce.output.key.fields，后续需要看下二者的关系。*

*stream开头的是streaming特有的，mapred.map.tasks和mapred.reduce.tasks是通用的*

## 基本原理

Hadoop Streaming要求用户编写的Mapper/Reducer从标准输入（stdin）中读取数据，将结果写入到标准输出（stdout）中，
这非常类似于Linux的管道机制。

正因此，我们在linux本地方便对Streaming的MapReduce进行测试

```bash
$ cat <input_file> | <mapper executable> | sort | <reducer executable>

# python的streaming示例
$ cat <input_file> | python mapper.py | sort | python reducer.py
```

# Streaming的WordCount示例

准备数据

自行替换其中的<username>

```bash

$ cat input/input_0.txt
Hadoop is the Elephant King!
A yellow and elegant thing.
He never forgets
Useful data, or lets
An extraneous element cling!

$ cat input/input_1.txt  
A wonderful king is Hadoop.
The elephant plays well with Sqoop.
But what helps him to thrive
Are Impala, and Hive,
And HDFS in the group.

$ cat input/input_2.txt  
Hadoop is an elegant fellow.
An elephant gentle and mellow.
He never gets mad,
Or does anything bad,
Because, at his core, he is yellow.

$ ${HADOOP_HOME}/bin/hadoop fs -mkdir -p /user/<username>/wordcount

$ ${HADOOP_HOME}/bin/hadoop fs -put input/ /user/<username>/wordcount
```

编写Mapper

```python
#!/bin/env python
# encoding: utf-8

import re
import sys


seperator_pattern = re.compile(r'[^a-zA-Z0-9]+')

for line in sys.stdin:
    for word in seperator_pattern.split(line):
        if word:
            print '%s\t%d' % (word.lower(), 1)
```

编写Reducer

```python
#!/bin/env python
# encoding: utf-8

import sys

last_key = None
last_sum = 0

for line in sys.stdin:
    key, value = line.rstrip('\n').split('\t')
    if last_key is None:
        last_key = key
        last_sum = int(value)
    elif last_key == key:
        last_sum += int(value)
    else:
        print '%s\t%d' % (last_key, last_sum)
        last_sum = int(value)
        last_key = key

if last_key:
    print '%s\t%d' % (last_key, last_sum)
```

使用itertools.groupby的Reducer

```python
#!/bin/env python
# encoding: utf-8

import itertools
import sys


stdin_generator = (line for line in sys.stdin if line)

for key, values in itertools.groupby(stdin_generator, key=lambda x: x.split('\t')[0]):
    value_sum = sum((int(i.split('\t')[1]) for i in values))
    print '%s\t%d' % (key, value_sum)
```

示例代码太过简单，应该包含更多的异常处理，否则会导致程序异常退出的。

# 调试方法

本地调试方法

```python
$ cat input/* | python mapper.py  | sort | python reducer.py
a       2
an      3
and     4
anything        1
are     1
at      1
bad     1
because 1
but     1
cling   1
core    1
data    1
does    1
elegant 2
element 1
elephant        3
extraneous      1
fellow  1
forgets 1
gentle  1
gets    1
group   1
hadoop  3
hdfs    1
he      3
helps   1
him     1
his     1
hive    1
impala  1
in      1
is      4
king    2
lets    1
mad     1
mellow  1
never   2
or      2
plays   1
sqoop   1
the     3
thing   1
thrive  1
to      1
useful  1
well    1
what    1
with    1
wonderful       1
yellow  2
```

# 常见问题和解决方法

# 其他

# 参考

1. [Apache Hadoop MapReduce Streaming](https://hadoop.apache.org/docs/r2.6.0/hadoop-mapreduce-client/hadoop-mapreduce-client-core/HadoopStreaming.html)
1.
