---
layout: post
title: Scala implicit 使用简介
category: scala
tags: ['scala', 'implicit']
---

# 前言

在 Scala 中有一个强大的语言特性 implicit，提供了非常特殊并且强大的隐式转换功能。说它特殊，主要是因为在笔者目前接触到的语言中，也没有发现类似的语法，对于笔者来说这个特性非常的神秘。功能强大是因为这个特性确实好用，笔者在实际项目中进行了简单的尝试，发现对简化代码非常有帮助，可以替代默认参数，并且更加灵活。

简单来理解 implicit 的作用，可以用一句话来概括：在编译器出现错误的时候，可以通过隐式转换进行一次补救。阅读下面的内容时，请注意体会和理解这句话，相信你会对 implicit 有新的认识。

隐式转换，可以是参数、函数、类，所以本文从这三个地方开始入手，分别讲述其基本用法。希望本文可以为读者理解 implicit 提供一点帮助。本文的测试 scala 环境为 2.11。

# 隐式参数

隐式参数（implicit parameters）是最简单的形态，也是最容易理解的。与函数参数中增加默认值的效果类似，但是更为灵活。

下面以一个打印日志的简单示例，来看下基本用法。

```scala
object ImplicitParameters {

    implicit val name: String = "default"  // 定义隐式变量
    log("init")

    def log(msg: String)(implicit name: String): Unit = println(s"[$name] $msg")

    def process(): Unit = {
        implicit val name: String = "process"
        log("doing something")
    }

    def main(args: Array[String]): Unit = {
        implicit val name: String = "main"
        log("start")
        process()
        log("end")("custom name")
    }
}
```

上述代码中定义了一个 log 方法，其中参数列表分为了两个部分，一般在第二个参数列表中定义隐式参数。在使用的时候，只需要提前定义 implicit 参数并且类型匹配，就可以在后续的调用中省略第二个参数列表，实现了一个范围内的默认值。当然也可以显示传入一个值。相对来说，比参数默认值更加灵活。

上述示例代码的输出如下。

```scala
[default] init
[main] start
[process] doing something
[custom name] end
```

# 隐式函数

隐式函数（implicit function）与参数基本一致。编译器在出现方法调用未找到合适匹配的时候，当前作用域内如果有隐式函数，编译器会尝试进行转换后，再进行调用。相当于给了一个修复编译器调用错误的机会，同时也赋予了强大的扩展能力，可以更为方便地实现 DSL。

下面我们通过扩展基础类行 Int，赋予日期操作的方法。本示例来自《Scala 实用指南》的 5.5.1。

```scala
import scala.language.implicitConversions
import java.time.LocalDate

class DateHelper(offset: Int) {
    def days(when: String): LocalDate = {
        val today = LocalDate.now
        when match {
            case "ago" => today.minusDays(offset)
            case "from_now" => today.plusDays(offset)
            case _ => today
        }
    }
}

object DateHelper {
    val ago = "ago"
    val from_now = "from_now"

    implicit def convertInt2DateHelper(offset: Int): DateHelper = new DateHelper(offset)
}

object DaysDSL extends App {
    import DateHelper._

    println(2 days ago)
    println(5 days from_now)
}
```

上述的代码通过将 Int 转换为 DateHelper 类，实现了对 Int 方法的扩展，提供了一个方便的辅助日期功能。实用的过程中，是需要 implicit 的函数被引入到当前使用的作用域内，所以会有一个 import 语句。否则，编译器是无法进行隐式转换的。更详细的规则，可以在转换规则部分查看。

# 隐式类

隐式类（implicit class）和上述的隐式函数一样，如果一个类本身只是为了扩展的话，可以直接申明为 implicit 类。下面我们重写上面的例子，本例同样来自《Scala 实用指南》的 5.5.2。

需要注意：因为隐式转换太过强大，隐式类只能是局部定义的类，不可以是全局类，否则编译器会报错。

```scala
import java.time.LocalDate

object DateUtil {
    val ago = "ago"
    val from_now = "from_now"

    implicit class DateHelperImplicitClass(offset: Int) {
        def days(when: String): LocalDate = {
            val today = LocalDate.now
            when match {
                case "ago" => today.minusDays(offset)
                case "from_now" => today.plusDays(offset)
                case _ => today
            }
        }
    }
}

object DaysDSL extends App {
    import DateUtil._

    println(2 days ago)
    println(5 days from_now)
}
```

基本与隐式函数的效果和使用方法一致，但是在实际每次执行的时候，会有创建一个隐式类的实例，然后调用方法，这样就是有短生命周期的对象的创建和销毁。Scala 有一种值类（[Value Class](https://docs.scala-lang.org/zh-cn/overviews/core/value-classes.html)）的方法，可以消除这种额外的开销。唯一的改变就是继承 AnyVal。

```scala
implicit class DateHelperImplicitClass(offset: Int) extends AnyVal {
```

在 Scala 隐式包装类都是作为值类实现的，例如 RichInt 等。

# implicitly 函数

在 Scala 的 Predef 中定义有一个函数 implicitly，定义如下

```scala
def implicitly[T](implicit e: T): T = e
```

通过这个函数的定义，我们可以根据前文来理解，是用来获取当前范围内某种类型的隐式参数。我们来大概看一下用法。

```scala
implicit val a = "test"
val b = implicitly[String]  // "test"
```

# 实例分析

Spark 的 RDD 就内部实现了隐式转换，在 RDD 的 T 为不对形式时会进行隐式转换，从而提供了针对特定类型 RDD 的方法支持。

这里以 PairRDD 为例，抽取其中隐式转换的部分，笔者自行抽取简化了其中的代码逻辑，方便理解隐式转换的使用方法，读者可以自行阅读 Spark RDD [源码](https://github.com/apache/spark/blob/branch-2.1/core/src/main/scala/org/apache/spark/rdd/RDD.scala#L1860)来查看实现细节。

```scala
import scala.language.implicitConversions

class RDD[T] {
  def map(): Unit = println("map")
}

object RDD {
  implicit def rddToPairRDDFunctions[K, V](rdd: RDD[(K, V)]): PairRDDFunctions[K, V] = new PairRDDFunctions(rdd)
}

class PairRDDFunctions[K, V](self: RDD[(K, V)]) {
  def combineByKey(): Unit = println("combineByKey")
}

object Demo {
  def main(args: Array[String]): Unit = {
    val rdd = new RDD[String]
    rdd.map()

    val pairRdd = new RDD[(String, String)]
    pairRdd.map()
    pairRdd.combineByKey()
  }
}
```

通过在伴生对象 object 中定义了一个 implicit 方法，来对特定的(K, V)类型的 RDD 进行了隐式转换，从而额外增加了部分方法的目的。理解这个例子，再去看 Spark RDD 源码就能理解其中的原理了。

这里的隐式作用查找范围与之前的示例是不同的，此处使用了类型的隐式作用域。隐式转换的查找是分为两个作用域的：首先，在使用的作用域内查找，这里没有 RDD 到 PairRDDFunctions 的隐式转换方法，然后会到类型定义的隐式作用域范围，指与该类型相关联的全部伴生模块，这里 RDD 有个 object 的模块，这里有 implicit 方法，定义了到 PairRDDFunctions 的转换，所以隐式转换成功，找到了 combineByKey 方法。

# 隐式转换规则

笔者根据资料和实验，自行整理的规则，可能存在遗漏，读者有疑惑的部分可以进行留言交流。

隐式转换的规则有个基本的方向，就是隐式转换功能太过强大，规则是给予了比较多的约束，可以让其被更恰当合适地实用，基本规则总结整理如下：

1. 首先，隐式转换的变量、函数、类都是带有 implicit 关键词的，这个是最基本的语言要求。
2. 隐式参数的查找范围是有明确限制的。第一规则：在使用的位置可见，必须是可以无需前缀引用的，不可以是 foo.x，必须是 x；第二规则：第一规则未找到的情况下，会在类型的隐式作用域内查找，隐式作用域是指与该类型相关联的全部伴生模块。此部分参见《深入理解 Scala》的 5.1.3，笔者对第二规则目前的理解只停留在伴生 object 会被查找，其他的情况暂时未碰到。
3. 隐式转换触发的时机是在编译器出现了查找方法失败的情况下才会被触发，并且只可以进行一次隐式转换。

需要注意的点：

1. 在使用的时候，不要再一个作用域内不要定义多个相同类型的隐式变量，因为隐式变量是根据类型匹配，所以定义多个相同类型的隐式变量，会报编译错误，编译器无法进行选择。另外，隐式变量本身也是可以在作用域内使用和变量一样的遮蔽（shadow）。
2. 在使用隐式函数的时候，请 import scala.language.implicitConversions，否则编译的时候会有一个警告：warning: there was one feature warning; re-run with -feature for details。

# 总结

本文简单介绍了 implicit 的使用方法，笔者目前仍然是一个 scala 新手，难免有理解和表达有误的地方，请读者留言一起讨论。

想进一步深入了解 implicit，可以考虑从本文的参考文献入手。

# 参考文献

1. [深入理解 Scala(5.1.3)](https://book.douban.com/subject/26302645/)
2. [Scala 实用指南(3.5, 5.5.1, 5.5.2)](https://book.douban.com/subject/30249691/)
3. [IMPLICIT CLASSES](https://docs.scala-lang.org/zh-cn/overviews/core/implicit-classes.html)
4. [TOUR OF SCALA: IMPLICIT PARAMETERS](https://docs.scala-lang.org/tour/implicit-parameters.html)
5. [What is the Scala identifier “implicitly”?](https://stackoverflow.com/questions/3855595/what-is-the-scala-identifier-implicitly)