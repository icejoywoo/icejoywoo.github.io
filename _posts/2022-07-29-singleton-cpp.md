---
layout: post
title: c++ 11 的单例模式
category: cpp
tags: ['cpp', 'design pattern', 'singleton']
---

# 概述

在开发过程中，Singleton 是一个非常常用的模式，例如，系统配置、内存管理等全局唯一的实例都需要使用单例。

在 C++ 11 之前，实现一个线程安全的单例需要一些特别的 trick。本文介绍 C++ 11 之后的实现方式，非常的简单。

# 实现

实现的关键点：
* 构造函数设置为 private
* 拷贝和移动的构造和赋值函数也都移除，设置为 delete
* static GetInstance 方法来获取其实例
* 在 GetInstance 方法中，使用 static local variables 来初始化 instance

这里主要使用的就是 C++ 11 中对于 static local variables 的明确定义：

> If multiple threads attempt to initialize the same static local variable concurrently, the initialization occurs exactly once.

这样就保证了其线程安全，极大简化了单例的实现。

实现代码如下：

```cpp
#include "gtest/gtest.h"

class Singleton {
public:
    static Singleton* GetInstance() {
        static Singleton* instance = new Singleton;
        return instance;
    }

private:
    Singleton() = default;
    ~Singleton() = default;

    Singleton(const Singleton&) = delete;
    Singleton(Singleton&&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    Singleton& operator=(Singleton&&) = delete;
};

TEST(SingletonTest, BasicTest) {
    // singleton test
    Singleton* singleton_a = Singleton::GetInstance();
    Singleton* singleton_b = Singleton::GetInstance();
    ASSERT_EQ(singleton_a, singleton_b);

    // cannot create a new instance in constructor
    // Singleton s;
}
```


# 参考资料

1. [Modern C++ Singleton Template](https://codereview.stackexchange.com/questions/173929/modern-c-singleton-template)
2. [C++ 单例模式 Singleton](https://zhuanlan.zhihu.com/p/454537024)