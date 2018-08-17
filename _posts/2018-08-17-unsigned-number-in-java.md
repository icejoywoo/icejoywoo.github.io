---
layout: post
title: Java 中使用无符号整型（unsigned int）的使用方法
category: java
tags: ['java']
---

# 背景

计算机科班出身大多学过离散数学，或者理工类专业也大多学习过 C 或 C++ 语言，从中我们了解到基本类型的整形有 short、int、long 等，还分别有无符号（unsigned）和带符号（signed）的，但是不是所有语言都支持无符号。Java 就是这样一门语言。

但是，在工程实践中，我们难免会有一些场合会用到无符号整型。例如，加密算法等会常进行多轮位运算，这个时候位运算都要求是无符号的。

本文来介绍一下笔者在这块的一些经验，前段时间对一个 C 代码翻译成了 Java 代码，在此过程中，有一点经验总结，记录于此。大家有更好的方法，欢迎留言交流。笔者后续发现新的简洁的方式，也会更新本文。

Java 新版本中会引入无符号，这个不支持无符号的设计，本身是个非常不明智的决定。

# 使用 unsigned

## 无符号右移

目前对于无符号的支持，Java 只在位运算的右移支持了一个特殊的符号 >>>，支持右移忽略符号位，用 0 填充。但是这个在实践中肯定是远远不够的，很多场景无法满足。

## 类型升级变相支持

目前想要获得无符号的效果，当前的方法只能进行类型的升级，就是 byte 和 short 转换为 int，int 转换为 long，通过与运算来只保留与原本类型位数一致。因为本身 Java 对各个类型的长度是做了定义的，所以跨平台使用不会有问题。

```java
 // unsigned 注释：java 中没有 unsigned，所以为了实现 unsigned，需要使用比原本类型更大的类型，通过位运算获取其 unsigned 的值
// unsigned byte & short -> int，unsigned int -> long
private static int getUnsignedByte(byte b) {
    return b & 0x0FF;
}

private static int getUnsignedShort(short data) {
    return data & 0x0FFFF;
}

private static long getUnsignedInt(int data) {
    // data & 0xFFFFFFFF 和 data & 0xFFFFFFFFL 结果是不同的，需要注意，有可能与 JDK 版本有关
    return data & 0xFFFFFFFFL;
}
```

# bytes 类型转换

一般来说，无符号的位运算结束后，会将 bytes 转换为 String 或者数字类型，Java 对这类转换的支持还是比较好的，标准库都有相应的 API 支持。

## int/long 与 bytes 的互相转换

类型间的转换也属于很常见的操作，C++ 中经常使用这样的技巧来将 4 个 char 的数组变为一个 int。

Java 对这块的支持，还算比较友好，nio 中有 ByteBuffer。需要注意的是，大端（Big-endian）和小端（Little-endian）的选择，这个是与系统强相关的，一般大部分系统都为小端。

short、int 和 long 等类型用类似的 API 即可以完成与 bytes 的互相转换，需要注意三种类型的字节数在各个系统中是固定的，是 Java 语言规范定义的。

```java
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

ByteOrder order = ByteOrder.LITTLE_ENDIAN;

// long
long l = 2147483648L;
byte[] bytes = ByteBuffer.allocate(8).order(order).putLong(l).array();
long data = ByteBuffer.wrap(bytes, 0, bytes.length).order(order).getLong();

// int
int i = 123456;
byte[] bytes = ByteBuffer.allocate(4).order(order).putInt(i).array();
int data = ByteBuffer.wrap(bytes, 0, bytes.length).order(order).getInt();

// short

short s = 32767;
byte[] bytes = ByteBuffer.allocate(2).order(order).putShort(s).array();
int data = ByteBuffer.wrap(bytes, 0, bytes.length).order(order).getShort();
```

## String 与 bytes 的互相转换

String 有一个方法叫 getBytes，可以获取 bytes 数组。但是需要注意的是 Java 内部的字符编码是 UTF16 的，而非 UTF8。

还有一点需要注意的是，getBytes 是可以传入字符编码的，这个最好明确指定，否则会用系统默认的，这个可能会在不同环境下行为不一致，导致诡异的错误，较难定位解决。

bytes 转换为 String 也很简单，String 的构造函数直接支持的。

```java
import java.nio.charset.Charset;

Charset charset = Charset.forName("UTF-8");

String data = "abc";
byte[] bytes = data.getBytes(charset);

String newData = new String(bytes, 0, bytes.length, charset);
```

# 结尾

以上便是个人的一些经验，笔者通过对上述方法的使用，较为顺利地完成了代码翻译为 Java 的工作，并且测试通过。

希望可以帮助有需要的朋友。欢迎留言讨论。
