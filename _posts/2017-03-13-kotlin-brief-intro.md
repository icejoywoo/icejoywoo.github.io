---
layout: post
title: Kotlin 简单上手
category: kotlin
tags: ['kotlin','programming language']
---

kotlin 是 JetBrains 公司推出的一个语言，基于 JVM，100% 与 Java 兼容，主要面向 Android 开发，新版可以编译为 JavaScript，可以运行在 Node.js 或浏览器中。相对于 Java 语言，加入了很多语法糖和特性，使得很多场景下的代码得到极大的简化，比 Java 简洁很多。

通过[kotlin-koans](https://github.com/Kotlin/kotlin-koans) 的练习，对 kotlin 有了基本对了解，本文就描述一下个人觉得比较有意思的特性，不会十分完整。

# Mutable Variable & Immutable Value

kotlin 的变量申明分为两种，直接在申明时确定是否可变，val 为不可变变量，var 为可变变量。不可变变量是函数式编程中非常重要的，大部分都是不可变变量。

kotlin 本身是一门静态类型的语言，但他具有一定的类型推导能力，在一些情况无需申明具体类型，编译器可以作出推断，在形式上有一些动态语言的样子，但是请记住，本质上 kotlin 和 Java 一样是静态语言。当他无法进行类型推导的时候，必须显示写明其中的类型。这个可以在使用语言的时候去体会，IDE 会有相应的编译错误提示。

# Null 的处理

Swift 中也有类似的语法，主要是为了解决 NPE（NullPointerException）问题。本节主要参考了官方文档[Null Safety](https://kotlinlang.org/docs/reference/null-safety.html)，也参考了 kotlin-koans 的 7 nullalbe types 题目。

在类型系统中加入了 nullable，默认使用类型申明的对象是不可以赋值为 null 的，会报编译错误，也就是说从类型上对是不是可以为 null 进行了区分。语法是在类型后面加问号，表示允许为 null。示例如下：

```kotlin
var a: String = "abc"
a = null // compilation error

var b: String? = "abc"
b = null // ok
```

对于 nullable 类型在使用的时候就需要检查是否为 null，这个需要用 if 分支语句来表达，kotlin 还提供了一种语法来简化这个检查操作。

```kotlin
val l = if (b != null) b.length else -1

// 如果 b 为 null，则为 null；否则会调用 length
val l = b?.length

// 如果 b?.length 为 null，就使用后面的 -1，这个叫做 elvis operator
val l = b?.length ?: -1

// 因为 return 在 kotlin 中也是一个表达式，所以可以简化检查某些属性为 null 返回的代码
val l = b?.length ?: return
```

对于 nullable 类型直接用来调用其方法或属性，是会报编译错误的，可以使用 !! 来变成忽略这个，可能会抛出 NPE，就变成与 Java 的处理方式了。这种方式尽量不要用，除非你确定你用的时候不会抛出 NPE。

```kotlin
b.length // compilation error

b!!.length // may throw NPE
```

可以使用 as? 来进行安全的类型转换，当转换失败时会返回 null。

```kotlin
val aInt: Int? = a as Int  // throw java.lang.ClassCastException: java.lang.String cannot be cast to java.lang.Integer

val aInt: Int? = a as? Int  // null
```

# 运算符重载

在 Java 中是不支持运算符重载的，在 ruby、scala、python 等语言中都有运算符重载，运算符重载是一个非常方便的语法，合理的使用可以编写非常优雅简洁的代码。

kotlin 中的运算符重载是一种语法糖特性，将各种运算符直接对应成一个预定义的方法名，并且方法申明要加上 operator。具体可以参考官方文档[Operator overloading](https://kotlinlang.org/docs/reference/operator-overloading.html)，可以结合 kotlin-koans 中 iii_conventions 中的示例来学习。

下面用复数加法来说明重载的基本语法。

```kotlin
data class RationalNumber(val numerator: Int, val denominator: Int) {
    operator fun plus(other: RationalNumber): RationalNumber = RationalNumber(this.numerator + other.numerator, this.denominator + this.denominator)
}

fun main(args: Array<String>) {
    val r1 = RationalNumber(1, 5)
    val r2 = RationalNumber(5, 3)
    val r = r1 + r2  // RationalNumber(numerator=6, denominator=10)
}
```

[Data Classes](https://kotlinlang.org/docs/reference/data-classes.html) 是 kotlin 支持的一种类定义方式，省去了 Java 中大量的 setters 和 getters 代码，更为简洁。

## invoke 方法

object 或 class 实现一个 invoke operator 方法，既可以拥有像函数一样被调用，这是一个相对比较特殊的运算符重载。

```kotlin
// object declarations: singleton，与 scala 类似
object Foo {
    operator fun invoke() = println("hello")
    operator fun invoke(str: String) = println(str)
}

Foo()  // hello
Foo("world")  // world

class Bar {
    operator fun invoke() = println("hello")
    operator fun invoke(str: String) = println(str)
}

val b = Bar()
b()  // hello
b("world")  // world
```

# When 表达式

When 表达式是一个类似 switch 语句的控制流语句，还可以使用 is 和 !is 来进行类型判断，算是有个阉割版的 Pattern Matching。用法很简单，看下面的示例：

```kotlin
val hasPrefix = when(x) {
    is String -> x.startsWith("prefix")
    else -> false
}
```

官方文档[When Expression](https://kotlinlang.org/docs/reference/control-flow.html#when-expression)。

# 函数及函数式编程

## Lambda

匿名函数是函数式编程的基础，是一个非常重要的基本概念。现代语言中很少有不支持的，C++ 和 Java 在新版标准中都有对 Lambda 的支持。

```kotlin
// 函数类型：(...) -> ... 对应参数列表和返回值类型
val square: (Int) -> Int = { x: Int -> x * x }

// 在函数体内没有指明 x 的类型
val square: (Int) -> Int = { x -> x * x }

// 匿名函数体在单个参数的时候，可以使用 it 来代替，不需申明
val square: (Int) -> Int = {it * it}

square(4)

// 匿名函数直接调用，这里没有指明返回类型，但是可以推导出返回值类型为 Int（根据 Int.plus 函数）
{ x: Int -> x * x }(4)
```

## SAM conversion

官方文档 [Calling Java code from Kotlin](https://kotlinlang.org/docs/reference/java-interop.html#sam-conversions) 中有 SAM 的说明，这个主要是针对调用 Java 代码，在 Java 8 中也引入了这个支持。

SAM 是 Single Abstract Method 的简称，Java 中存在一些只有一个方法的接口，例如 java.util.Comparator。

```kotlin
val arrayList = arrayListOf(1, 5, 2)

// object expression
arrayList.sortWith(object: Comparator<Int> {
    override fun compare(o1: Int, o2: Int): Int = o1 - o2
})

// 简化的 lambda 形式
arrayList.sortWith(Comparator<Int> { x: Int, y: Int -> x - y })

println(arrayList)
```

## High Order Function

kotlin 同样支持高阶函数，高阶函数的基础是函数是一等公民，函数可以作为函数的参数和返回值，可以在定义变量的地方定义函数。

```kotlin
// 使用函数作为参数
fun <T> filter(collection: Iterable<T>, predicate: (T) -> Boolean): List<T> {
    val result = ArrayList<T>()
    for (i in collection) {
        if (predicate(i)) {
            result.add(i)
        }
    }
    return result
}

filter(arrayListOf(1, 2, 3, 4, 5), { it % 2 == 0})  // [2, 4]

// 使用函数作为返回值
fun times(num: Int): (Int) -> Int = {it * num}

times(4)(5)  // 20
```

阅读官方文档[Higher-Order Functions](https://kotlinlang.org/docs/reference/lambdas.html#higher-order-functions)了解更多。

## Extensions

kotlin 可以对现有的类，包括内置的类型，都可以使用扩展函数来进行功能扩展，这个和 Ruby 很像。

```kotlin

// 使用了上面定义的复数，可以通过扩展内部的 Int 和 Pair<Int, Int> 来扩展内部类型，与自定义类型更好的转换
fun Int.r(): RationalNumber = RationalNumber(this, 0)
fun Pair<Int, Int>.r(): RationalNumber = RationalNumber(this.first, this.second)

println(5.r())  // RationalNumber(numerator=5, denominator=0)
println(Pair(4, 5).r())  // RationalNumber(numerator=4, denominator=5)
```

更多详情可以参考官方文档[Extension Functions](https://kotlinlang.org/docs/reference/extensions.html#extension-functions)。

## Tail recursion

kotlin 有一个关键字来优化尾递归，首先需要改造函数为可以尾递归优化的。怎样是可以尾递归优化的呢？就是函数的每一次调用都和之前的调用环境无关，在知乎上[什么是尾递归？](https://www.zhihu.com/question/20761771)中，有人解释说是在函数内部调用自己之后没有其他操作就是尾递归，本质就是无需再使用之前的函数环境。

```kotlin
fun factorial(num: Int): Int {
    return if (num == 0) 1 else factorial(num-1) * num
}

// 考虑到 Int 可能溢出，所以使用 BigInteger
fun factorial(num: Int): BigInteger {
    return if (num == 0) BigInteger.valueOf(1) else factorial(num-1).times(BigInteger.valueOf(num.toLong()))
}

// 需要明确指出这个函数是尾递归的，不会自动识别
tailrec fun factorialTailRecursive(num: Int, r: BigInteger = BigInteger.valueOf(1)): BigInteger {
    return if (num == 0) r else factorialTailRecursive(num-1, r.times(BigInteger.valueOf(num.toLong())))
}

fun main(args: Array<String>) {
    println(factorial(5))  // 120
    println(factorialTailRecursive(10000))
}
```

kotlin 的尾递归支持是需要显示申明的，一些语言中不支持尾递归，例如 Python，另外一些无需显示申明，如 Scala。

官方文档[Tail recursive functions](https://kotlinlang.org/docs/reference/functions.html#tail-recursive-functions)。

# 小结

经过几天的简单体验，感觉 kotlin 还是一个非常不错的语言，上手比较舒服，对 Java 程序员很友好。很多语法设计会觉得似曾相识，应该是借鉴了比较多当前流行的语言，使用起来还是很不错的。

本文介绍了 kotlin 中的一小部分，希望可以抛砖引玉，一起来学习和研究这门新语言。

# 学习资料

1. [kotlin-koans](https://github.com/Kotlin/kotlin-koans)
2. [Kotlin 视频教程](https://github.com/enbandari/Kotlin-Tutorials)
