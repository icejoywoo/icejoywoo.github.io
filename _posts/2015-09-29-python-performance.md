---
layout: post
title: CPython的常见性能问题
category: python
tags: ['python', 'CPython', 'performance']
---

# 简介

Python 是一门常用的脚本语言，做一些日常小功能的开发和文本处理之类的事情非常方便，大多数人不以 Python 为主语言，所以导致大家并不是十分重视 Python，在日常的 Python 代码编写中，书写受主语言（可能是 C/C++、Java 等语言）的影响，导致经常会写出一些反 Pythonic 的代码。

本文就是列举一些笔者在实践中总结出的一些问题，并提供解决思路，当然现实环境千差万别，请大家真对自己的情况进行分析和解决。

本文分为两个部分，第一部分主要介绍常见性能问题和解决方法，第二部分简单介绍一下性能问题的其它解决方法。

# 常见性能问题

这里列举了一些 Python 的常见性能问题和解决方法，对其它语言也是有一定的参考价值。

一条基本的原则：Python 中如果有内置（built-in）方法，最好优先使用。这个需要对常用 API 非常熟悉，内置方法相对效率很高，大多数底层是用 C 实现的。切忌自己随意发明创造各种功能，这样效率低且易出错，建议大家经常翻看 Python 官方文档。

这里只是笔者在实践和学习中总结的一些问题，并不全面，只是希望能对读者有所帮助。

本文的示例代码在 [github](https://github.com/icejoywoo/python-performance) 上。

## 字符串拼接

字符串拼接问题指的是在字符串大量拼接的时候，由于内存的频繁分配和释放，导致程序的性能急剧下降，这个问题在开发和上线初期是很难发现，只能在开发的时候尽量避免，遵循各种字符串拼接的 best practice。

这个问题在 C/C++、Java 等语言中也存在，不同语言的解决方法不同。例如：Java 的解决方法是建议使用 StringBuffer，然后编译器在编译为字节码的时候，会对字符串拼接进行优化，自动加上 StringBuffer；C++ 如果使用 std::string 的话，需要注意的就是 reserve 一个足够的大小，防止内存频繁分配的问题即可。

对于 Python 来说，是使用字符串的 join 方法是大量拼接字符串比较好的方法，格式化字符串可以用 % 或 format。

```python
title = 'string concatenation'
# 用加号拼接，大量字符串拼接的时候请慎用加号拼接
title_html = '<title>' + title + '</title>'

# 使用 %
title_html = '<title>%s</title>' % title

# format
title_html = '<title>{}</title>'.format(title)

# join 拼接
buf = []
buf.append('<title>')
buf.append(title)
buf.append('</title>')
title_html = ''.join(buf)
```

## 基本集合类型的使用问题

Python 的基本集合类型包括 List、Tuple、Dict、Set 四种，对这些数据结构熟悉，并且使用正确即可。Python 有一个 in 操作，两种用法：for 遍历集合；用于判断元素是否在集合中。in 也是可以操作 str 或 unicode 类型的。

```python
for i in range(100):
    # do something

words = ('hello', 'world')
if 'test' in words:
    # do something
```

对于判断元素是否在集合这种情况，需要考虑数据量的大小，这个是基本的数据结构问题。条目比较多的时候，需要考虑效率问题，这种情况考虑 Set 或 Dict。

## 生成器的使用

首先，说一说 range 和 xrange 的区别，这个在很多教程中都有讲解，range 直接返回的是一个 List，xrange 返回的是一个 xrange 类型，可以进行遍历，xrange 是 lazy 的方式，是立即返回的，并且内存占用少。

Python 提供了一种生成器（Generator）的机制，和 xrange 的效果非常类似，lazy 的方式可以提升效率，不用一次性加载到内存，可以节省内存的使用，这个在数据量大的时候，非常有用。需要注意的一点是，生成器只能遍历一次，需要多次遍历，只需多次初始化生成器即可，代价也较小。生成器相对于有其它语言背景的人来说可能是一个比较新的概念，不是每种语言都内置了这种机制，下面对生成器做一个简单的介绍。

Python 中生成器主要是通过 yield 关键字来实现的，是一种特殊的返回方式（另外一种返回是常见的 return），也是从函数式编程中借鉴来的一种思想。下面举个简单的例子说明 yield 的简单用法。

```python
# 从 0 开始，每次递增 1，到无穷
def infinite_increment():
    i = 0
    while 1:
        yield i
        i += 1

for i in infinite_increment():
    # do something
```

在处理数据的过程中，采用 yield 的方式，可以实现多个步骤的流式处理，在效率和内存占用上都会有一定程度的提升。

```python
def even():
    for i in infinite_increment():
        if i % 2 == 0:
            yield i


def multiply(x):
    for i in even():
        yield i * x


for i in multiply(2):
    # do something
```

yield 关键字还可以实现类似 coroutine 的功能，增加了 send 等方法，详见 [PEP 342](https://www.python.org/dev/peps/pep-0342/)，这个不在本文讨论范围内，感兴趣的读者可以自行搜索学习。

## 异常机制的使用

异常机制是一个现代语言的标配，大部分都是 try ... catch ... finally 的语法，Python 只是关键字使用的不一样，catch 在 Python 中是 except。

异常机制有一个特点，有正常逻辑和异常捕获处理逻辑。在实践中，有些场景我们只需要预处理一次，如果巧妙使用异常机制，在初始化状态的时候触发异常，然后异常捕获处理进行初始化，后续调用都走正常逻辑，这在某些情况下，是一种非常不错的优化选择。不过请注意代码可读性，适当增加注释。

为了说明使用方式，笔者举例解释，也是笔者实践中使用过的一个场景。假设，我们有一个查询字典的函数，首先需要加载字典，在第一次调用函数的时候加载字典。一般来说我们的思路是用一个 bool 标记变量，来判断是否已经加载字典，这种情形如果巧妙地使用异常机制，可以加速整个函数的效率。

```python
# simulate dict file string
dict_string = "A 10\nB 20\nD 5"

def query_wrapper():
    not_init = True

    def wrapper(k):
        if not_init:
            # simulate loading dict file
            d = dict([line.split() for line in dict_string.split('\n')])
        return d.get(k, None)

    return wrapper

query = query_wrapper()

def query_wrapper_e():
    d = [None]

    def wrapper(k):
        try:
            return d[0].get(k, None)
        except AttributeError:
            d[0] = dict([line.split() for line in dict_string.split('\n')])
            return d[0].get(k, None)

    return wrapper

query_e = query_wrapper_e()
```

用异常机制来判断字典未被初始化，然后在异常捕获中加载字典。相对于前一种实现来说，这样使得后续的调用都不需要在判断 bool 标记变量，少了一次判断，在频繁被调用 的时候，获得的性能提升还是很可观的。

在参考资料中，也有一个例子，以初始化 dict 为例，这个例子也是使用了异常机制来进行了优化。

```python
# version 1
wdict = {}
for word in words:
    if word not in wdict:
        wdict[word] = 0
    wdict[word] += 1

# version 2
wdict = {}
for word in words:
    try:
        wdict[word] += 1
    except KeyError:
        wdict[word] = 1
```

## 列表表达式

列表表达式（List comprehension）是一种 Python 的语法，主要用来替换之前的 map 和 filter 方法，并且性能相对普通的写法有一定的性能提升。

```python
def even_filter_lc():
    """ list comprehension
    """
    return [i for i in xrange(1000) if i % 2 == 0]


def even_filter():
    r = []
    for i in xrange(1000):
        if i % 2 == 0:
            r.append(i)
    return r
```

列表表达式的系列包含生成器表达式（Generator comprehension）和 Dict comprehension，这种语法相当简洁。

```python
# 字典的 key value 反转
reversed_dict = {v:k for k, v in d.items()}

# Set 的使用
t = {1, 3, 4, 6}
even_t = {i for i in t if i % 2 == 0}
```

本节中相关的 PEP：[PEP 202 -- List Comprehensions](https://www.python.org/dev/peps/pep-0202/)、[PEP 0289 -- Generator Expressions](https://www.python.org/dev/peps/pep-0289/) 和 [PEP 274 -- Dict Comprehensions](https://www.python.org/dev/peps/pep-0274/)。

## 临时小文件的处理

临时小文件是一些逻辑中不可避免的，比如生成一个文件然后发送 HTTP POST 请求上传到服务器等。这样处理，其中有一次磁盘 IO 操作，最好是内存中生成一个“文件”，然后来使用，这里的文件只要满足实现了文件接口就可以，就是所谓的 Duck type。

在 Python 中，提供了 StringIO 可以用来模拟文件，非常方便。

```python
import StringIO

import requests

f = StringIO.StringIO()
f.write('test file')
f.flush()
f.seek(0)

requests.post('http://xxx.com/upload', files={
    'file': f,
})
```

示例代码中使用了 [requests](http://docs.python-requests.org/en/latest/)。

# 其它

程序性能是一个需要权衡的东西，就需要考虑代价的问题，也就是性价比是否高，性能提升可以带来多大的收益，当然天下武功唯快不破。性能提升最理想的状态是代价很小，性能提升很大，可是现实很骨感。

在实践中笔者只使用过三种方法：使用 [PyPy](http://pypy.org/) 、寻找更高效的替代库和编写 Python 的 C/C++ 扩展。注意：PyPy 是不支持 C 扩展的。

我个人觉得解决问题的思路是从代价最小的开始试，一般步骤如下：先试 PyPy，再寻找更高效的替代库来替换现有的库，最后考虑 C 扩展。

PyPy 是一个 Python 的另一种实现，使用前首先需要考虑两个问题：项目代码是否为纯 Python，依赖的类库是否为纯 Python。具体的提升需要根据不同的情况进行测试。这种性能提升所需的代价是很小的，不过有不少限制，PyPy 有不少第三方库是不支持的，对 Python 标准库支持较好，对 Web 框架支持也较好。例如Hadoop Streaming 的 Python 脚本是可以考虑使用 PyPy 来跑的，只需要对现有的代码进行一次兼容性的测试即可。

对于 CPython 来说，Python 的类库非常多，可以寻找一个更高效的替代类库，来替换程序的部分功能。例如：[ultrajson](https://github.com/esnme/ultrajson) 替代原生的 json 模块。Python 内部有一些模块是有两种实现，一种是 C 扩展的方式，效率会更高一些。例如：pickle 和 cPickle，StringIO 和 cStringIO。一般来说需要寻找一些合适的类库，并且适当修改部分代码，代价相对大一些，大多数情况是可以接受的。

此外，还有一些其它的选择：

1. [Cython](http://cython.org/)：用来简化 C 扩展编写的库，用类似 Python 的语法来写扩展。
2. [Numba](http://numba.pydata.org/)：可以使用 Python 的原生方法来获得加速，有 just-in-time 支持，代价较小。

# 参考资料

1. [7 ways to improve your Python performance](http://www.monitis.com/blog/2015/05/25/7-ways-to-improve-your-python-performance/)
2. [Python 代码性能优化技巧](https://www.ibm.com/developerworks/cn/linux/l-cn-python-optim/)
3. [PerformanceTips](https://wiki.python.org/moin/PythonSpeed/PerformanceTips)
