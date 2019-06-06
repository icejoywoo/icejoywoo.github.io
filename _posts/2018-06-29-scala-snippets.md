---
layout: post
title: Scala 代码片段收集
category: scala
tags: ['scala']
---

# Scala 代码片段收集

## 简介

Scala 有很多语言技巧，目前对 Scala 还在学习中，收集各种代码片段供自己学习查看。

## Scala REPL -- Ammonite

Ammonite 是一款更好用的 Scala REPL，可以查看 [Github 主页](https://github.com/lihaoyi/Ammonite)。

## 不编译执行 Scala 脚本

Scala 是有编译过程的，但是也支持不编译执行。

```bash
$ echo 'println("hello, world!")' > hello.scala
$ scala -nc hello.scala
hello, world!
```

另外一种方法，是在 Scala Shell 中，使用 load 的方式。

```bash
$ echo 'println("hello, world!")' > hello.scala
$ scala
Welcome to Scala 2.12.6 (Java HotSpot(TM) 64-Bit Server VM, Java 10.0.1).
Type in expressions for evaluation. Or try :help.

scala> :load hello.scala
Loading hello.scala...
hello, world!
```

## 查看变量类型

调试代码过程中，难免需要去查看变量的类型的需求。

```scala
(Tested in Scala 2.8)

scala> def manOf[T: Manifest](t: T): Manifest[T] = manifest[T]
manOf: [T](t: T)(implicit evidence$1: Manifest[T])Manifest[T]

scala> manOf(1)
res0: Manifest[Int] = Int

scala> manOf("")
res1: Manifest[java.lang.String] = java.lang.String

scala> val m = manOf(List(1))
m: Manifest[List[Int]] = scala.collection.immutable.List[Int]

scala> m.erasure
res7: java.lang.Class[_] = class scala.collection.immutable.List

scala> m.typeArguments
res9: List[scala.reflect.Manifest[_]] = List(Int)

scala> val m2 = manOf(List(1, "string"))
m2: Manifest[List[Any]] = scala.collection.immutable.List[Any]

scala> m <:< m2
res10: Boolean = true
```

erasure 和 <:< 方法已经标记为 Deprecated，<:< 是测试是否为子类的方法，这个与范型有关。

> def <:<(that: ClassManifest[_]): Boolean
>   Tests whether the type represented by this manifest is a subtype of the type represented by that manifest, subject to the limitations described in the header.

上面的代码摘自[how to know type of a variable in scala](https://www.scala-lang.org/old/node/6410)。

上述代码在 Scala 2.12.6 测试均可执行。

## 将 Array 转换为 Tuple

Scala 的 Array 是与 Java 的相对应的，例如 scala 的 Array[String] 和 java String[] 是一样的。没有直接的 toTuple 方法，如何才能转换为 Tuple 了。

一个常见的使用场景是 Spark 中将原始的日志行进行拆分后返回了Array，但是需要转换为 Tuple，然后再用 toDF 转换为 dataframe。

```scala
spark.read.text("/path/to/file").map(row => {
    // 建设使用 \t 分割的 3 个字段，分别是 a、b、c
    val line = row.getAs[String]("value")
    line.split("\t") match {
        Array(a, b, c) => (a, b, c)
    }
}).toDF("a", "b", "c")
```
