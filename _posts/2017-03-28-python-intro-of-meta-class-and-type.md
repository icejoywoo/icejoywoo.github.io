---
layout: post
title: Python 的 type 和 meta class 简介
category: python
tags: ['Python']
---

# 引子

本文针对 Python 2.7。

Python 中的一切都是对象，包括类也是对象。大家有没有好奇，那类的类是什么呢？下面我们通过代码来去探索。

```python
a = 1
a.__class__  # int
type(a)  # int

class A(object):
    pass

A.__class__  # type
A.__class__.__class__  # type
type(A)  # type
```

type 的类还是 type，是一种递归定义了。大家一定比较好奇这个 type吧，下面首先探索一下神奇的 type。

# type 用法

我们可以看到类的类是 type，type 在 Python 中具有特殊的能力，有两种基本的用法，一种是我们常见的用于获取对象的类型，另一种就是用于动态地创建类。

type 创建类的基本用法：

```python
# type(类名, 父类的元组（针对继承的情况，可以为空），包含属性的字典（名称和值）)

# 使用 class 创建类
class Parent(object):
    foo = 'bar'

Parent.foo  # 'bar'

# 使用 type 创建类
Parent = type('Parent', (), {'foo': 'bar'})
Parent.foo  # 'bar'

# 创建继承类
Child = type('Child', (Parent, ), {'child': True})
Child.foo  # 'bar'
Child.child  # True
```

当我们使用 class 来创建类的时候，Python 实际上就是用 type 来创建类的，这种方式主要是通过元类(meta class)来实现的。

# 什么是 meta class

在创建类的时候，有一个特殊的属性(\_\_metaclass\_\_)，可以用函数或者类来指定元类。

下面分别定义多种方式，来看元类的形式。

```python
# 函数
def metaclass_update(future_class_name, future_class_parents, future_class_attr):
    """ __metaclass__ = metaclass_update """
    print future_class_name, future_class_parents, future_class_attr
    return type(future_class_name, future_class_parents, future_class_attr)

# callable class
class MetaClassUpdateFunctor(object):
    """ __metaclass__ = MetaClassUpdateFunctor() """

    def __call__(self, future_class_name, future_class_parents, future_class_attr):
        print future_class_name, future_class_parents, future_class_attr
        return type(future_class_name, future_class_parents, future_class_attr)

# 类
class MetaClassUpdate(type):
    """ __metaclass__ = MetaClassUpdate """

    def __new__(cls, future_class_name, future_class_parents, future_class_attr):
        """ ___init___ 或 __new__ 方法都可以 """
        print future_class_name, future_class_parents, future_class_attr
        # 这里也可以使用 return type(future_class_name, future_class_parents, future_class_attr)
        return type.__new__(cls, future_class_name, future_class_parents, future_class_attr)


class Foo(object):
    __metaclass__ = metaclass_update
    foo = 'bar'

    def __init__(self):
        self.a = 1

f = Foo()
print f.foo, f.a
# Foo (<type 'object'>,) {'__module__': '__main__', 'foo': 'bar', '__metaclass__': <__main__.MetaClassFunctor object at 0x10a112f90>, '__init__': <function __init__ at 0x10a11a050>}
# bar 1
```

元类可以捕获创建类的过程，可以修改并返回新的类，达到对类的修改。因为 meta class 本身带有 class，所以最好使用一个类来做元类，这样的话相对来讲意图更清晰。

# 应用

# tornado 的 url routers

这里介绍一个 type 的实际应用，是个人项目中碰到的一个为了兼容旧接口的问题，旧接口的逻辑是比较多重复的，并且使用了 CGI 的方式。

使用 tornado 开发 web 后端，需要加载配置文件来兼容一批老旧的接口，旧接口的逻辑是基本一致的，只是部分配置不同，映射的 url 也不同，tornado 的 url router 需要针对不同的 url 设置类，如果每个接口对应的逻辑都继承实现一个类来配置，就会有太多的冗余代码。

解决思路：用一个 BaseHandler 实现其基本逻辑，读取配置文件，通过 type 来生成 BaseHandler 的子类，完成 tornado url router 的配置。

简化逻辑后的示例代码如下。

```python
import tornado.ioloop
import tornado.gen
import tornado.web


config = {
    'foo': {
        'url': '/foo',
        'name': 'foo handler',
    },
    'bar': {
        'url': '/bar',
        'name': 'bar handler',
    },
}


class Context(object):
    def __init__(self, env=None):
        self._env = env if env else {}

    def __getattr__(self, item):
        if item in self._env:
            return self._env[item]
        else:
            raise AttributeError("Context object has no attribute %s" % item)


class BaseHandler(tornado.web.RequestHandler):
    # implemented in base class
    context = Context()

    @tornado.gen.coroutine
    def get(self):
        self.write(self.context.name)


url_routers = [
    (value['url'], type("%sHandler" % name.capitalize(), (BaseHandler,), {'context': Context(value)}))
    for name, value in config.items()
]


if __name__ == "__main__":
    application = tornado.web.Application(url_routers)
    application.listen(8888)
    tornado.ioloop.IOLoop.current().start()
```

# sqlalchemy 简单分析

sqlalchemy 是非常强大的 ORM 框架，简单分析一下其申明类的过程。

sqlalchemy 的简单示例如下：

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String

engine = create_engine('sqlite:///:memory:', echo=True)
Base = declarative_base()


class User(Base):
     __tablename__ = 'users'

     id = Column(Integer, primary_key=True)
     name = Column(String)
     fullname = Column(String)
     password = Column(String)

     def __repr__(self):
        return "<User(name='%s', fullname='%s', password='%s')>" % (self.name, self.fullname, self.password)

print type(User)  # <class 'sqlalchemy.ext.declarative.api.DeclarativeMeta'>
```

Base 就是一个动态创建的类。

```python
# sqlalchemy/ext/declarative/base.py
def declarative_base(bind=None, metadata=None, mapper=None, cls=object,
                     name='Base', constructor=_declarative_constructor,
                     class_registry=None,
                     metaclass=DeclarativeMeta):
    lcl_metadata = metadata or MetaData()
    if bind:
        lcl_metadata.bind = bind

    if class_registry is None:
        class_registry = weakref.WeakValueDictionary()

    # 1. 基类
    bases = not isinstance(cls, tuple) and (cls,) or cls
    # 2. 两个类成员
    class_dict = dict(_decl_class_registry=class_registry,
                      metadata=lcl_metadata)

    if isinstance(cls, type):
        class_dict['__doc__'] = cls.__doc__

    if constructor:
        class_dict['__init__'] = constructor
    if mapper:
        class_dict['__mapper_cls__'] = mapper

    # 3. 动态创建并返回一个类
    return metaclass(name, bases, class_dict)

# sqlalchemy/ext/declarative/api.py
class DeclarativeMeta(type):
    def __init__(cls, classname, bases, dict_):
        # 这个标记应该是保证这个只执行一次
        if '_decl_class_registry' not in cls.__dict__:
            _as_declarative(cls, classname, cls.__dict__)
        type.__init__(cls, classname, bases, dict_)

    def __setattr__(cls, key, value):
        _add_attribute(cls, key, value)
```

这里的 DeclarativeMeta 是 type 的子类， 其 __init__ 会在 User 子类定义的时候被调用，这样可以通过这个方法在里面进行初始化的操作。

这应该是一种 type 的用法，简化示例如下。

```python
class Meta(type):
    def __init__(cls, classname, bases, dict_):
        print classname, bases, dict_
        type.__init__(cls, classname, bases, dict_)

Base = Meta('Base', (), {})


class User(Base):
    pass
# output:
# Base () {}
# User (<class '__main__.Base'>,) {'__module__': '__main__'}
```

简单分析 sqlalchemy，元类还是非常强大的，但是也很难读懂，会有比较多的技巧在里面，需要习惯和适应。

# 参考

1. [深刻理解Python中的元类(metaclass)](http://blog.jobbole.com/21351/)
