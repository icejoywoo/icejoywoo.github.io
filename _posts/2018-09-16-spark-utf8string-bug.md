---
layout: post
title: Spark 2.1 UDF length 异常问题分析（UTF8String numChars bug）
category: spark
tags: ['spark', 'scala']
---

# 引子

本文记录了一次笔者对 Spark SQL 使用中碰到的问题的分析，使用的 Spark 版本为 2.1。本文描述的是一个已经在新版本（2.2及以后）中修复的问题，记录了整个问题的代码分析过程，希望可以对碰到类似的问题的朋友一点启发。在分析过程中，也窥视了 Spark 的一些内部实现。

基本结论：由于 UTF8String 对 UTF8 乱码字符的不兼容导致，没有考虑存在异常字符的情况，当出现例如中文乱码等情况的时候，在使用 length UDF 的时候会触发。

具体的讨论分析参考官方的 [jira issue](https://issues.apache.org/jira/browse/SPARK-23649) 和 [github issue](https://github.com/apache/spark/pull/20796)。

# 问题描述

笔者在使用 Spark SQL 的时候，碰到了一个奇怪的异常，测试的 SQL 如下：

```sql
select length(query) from test_db.test_table;
```

执行 SQL 会报错，limit 少量数据可以跑通，证明 SQL 本身是可以执行完成的，全量数据无法跑通，猜测可能存在数据异常的情况。

测试的字段是包含中文的，数量比较大，来源比较复杂，存在乱码的可能性，如何来提取乱码数据来验证异常是由乱码引起的呢？

笔者经过一番尝试，找到了一个比较简单的方式，可以通过正则的方式粗略过滤到乱码字符。UTF8 中文字符的取件大概为 \\u4e00-\\u9fa5，粗略的方式即可过滤到正常的中文，提取到乱码数据，可以通过下面的 SQL 验证。

```sql
select query from test_db.test_table where query rlike '[^%0-9a-zA-Z\\\u4e00-\\\u9fa5]+';
```

有类似问题的朋友，可以通过对正则表达式的修改，来符合各自数据的特点，需要多次调整和尝试，只要可以较好地提取乱码数据即可。

通过多次尝试和调整后，发现乱码数据是直接会触发该异常的，堆栈表现是完全一致的。

下面开始对问题进行进一步的分析。

# 问题分析

笔者首先从日志入手，找到异常的所在，通过异常堆栈定位到引发异常的代码，再进一步分析引发异常的原因。下面我们先从异常堆栈开始。

## 异常堆栈分析

查看日志，可以发现 executor 的异常堆栈信息大致如下（可能略有不同）：

```java
org.apache.spark.SparkException: Job aborted due to stage failure: Task xxxx in stage x.0 failed 4 times, most recent failure: Lost task x.x in stage x.x (TID xxxx, xxx.host.name, executor xx): java.lang.ArrayIndexOutOfBoundsException: 62
	at org.apache.spark.unsafe.types.UTF8String.numBytesForFirstByte(UTF8String.java:156)
	at org.apache.spark.unsafe.types.UTF8String.numChars(UTF8String.java:171)
	at org.apache.spark.sql.catalyst.expressions.GeneratedClass$GeneratedIterator.processNext(Unknown Source)
	at org.apache.spark.sql.execution.BufferedRowIterator.hasNext(BufferedRowIterator.java:43)
	at org.apache.spark.sql.execution.WholeStageCodegenExec$$anonfun$8$$anon$1.hasNext(WholeStageCodegenExec.scala:380)
	at org.apache.spark.sql.execution.SparkPlan$$anonfun$2.apply(SparkPlan.scala:231)
	at org.apache.spark.sql.execution.SparkPlan$$anonfun$2.apply(SparkPlan.scala:225)
	at org.apache.spark.rdd.RDD$$anonfun$mapPartitionsInternal$1$$anonfun$apply$25.apply(RDD.scala:826)
	at org.apache.spark.rdd.RDD$$anonfun$mapPartitionsInternal$1$$anonfun$apply$25.apply(RDD.scala:826)
	at org.apache.spark.rdd.MapPartitionsRDD.compute(MapPartitionsRDD.scala:38)
	at org.apache.spark.rdd.RDD.computeOrReadCheckpoint(RDD.scala:323)
	at org.apache.spark.rdd.RDD.iterator(RDD.scala:287)
	at org.apache.spark.scheduler.ResultTask.runTask(ResultTask.scala:87)
	at org.apache.spark.scheduler.Task.run(Task.scala:99)
	at org.apache.spark.executor.Executor$TaskRunner.run(Executor.scala:322)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
	at java.lang.Thread.run(Thread.java:748)
```

异常堆栈分析后发现，最关键的提示是在前三行，引起异常的代码是在 UTF8String 的两个方法 numBytesForFirstByte 和 numChars 上。

引起错误的类型是 ArrayIndexOutOfBoundsException，看到后略微有点困惑，觉得这个异常比较奇怪。下面我们开始对代码进行逐步分析。

## 引发异常的代码分析

下面摘取部分 UTF8String 的代码，包含 numBytesForFirstByte 和 numChars 两个方法。

```java
// copied from org.apache.spark.unsafe.types.UTF8String in spark 2.1
private static int[] bytesOfCodePointInUTF8 = {2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    4, 4, 4, 4, 4, 4, 4, 4,
    5, 5, 5, 5,
    6, 6};

/**
 * Returns the number of bytes for a code point with the first byte as `b`
 * @param b The first byte of a code point
 */
private static int numBytesForFirstByte(final byte b) {
  final int offset = (b & 0xFF) - 192;
  return (offset >= 0) ? bytesOfCodePointInUTF8[offset] : 1;  // 引起 java.lang.ArrayIndexOutOfBoundsException 异常的代码行
}

/**
 * Returns the number of bytes
 */
public int numBytes() {
  return numBytes;
}

/**
 * Returns the number of code points in it.
 */
public int numChars() {
  int len = 0;
  for (int i = 0; i < numBytes; i += numBytesForFirstByte(getByte(i))) {
    len += 1;
  }
  return len;
}
```

通过对上述代码的阅读和分析，笔者发现 bytesOfCodePointInUTF8 会有可能抛出 ArrayIndexOutOfBoundsException 异常，bytesOfCodePointInUTF8 数组的长度为 62，引发异常的下标值也为 62。

目前分析到问题出现的代码处，现在有两个问题：

1. 什么情况下会下标值为 62，导致出现数组访问越界异常？
2. UDF length 是如何最终调用了 UTF8String 的 numChars 方法？

下面我们分别分析这两个问题。

## 触发异常的原因

首先，需要对 UTF8 的基本编码规则有一定的了解才可以。

```java
// utf8 变长编码规则：
// 1字节 0xxxxxxx
// 2字节 110xxxxx 10xxxxxx
// 3字节 1110xxxx 10xxxxxx 10xxxxxx
// 4字节 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
// 5字节 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
// 6字节 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
// 不可能出现的情况 1111111x

// copied from org.apache.spark.unsafe.types.UTF8String in spark 2.1
private static int[] bytesOfCodePointInUTF8 = {2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    4, 4, 4, 4, 4, 4, 4, 4,
    5, 5, 5, 5,
    6, 6};

/**
 * Returns the number of bytes for a code point with the first byte as `b`
 * @param b The first byte of a code point
 */
private static int numBytesForFirstByte(final byte b) {
  final int offset = (b & 0xFF) - 192; // (b & 0xFF) 是提取了 byte 转换为 int，192 二进制为 0b11000000
  return (offset >= 0) ? bytesOfCodePointInUTF8[offset] : 1;  // 引起 java.lang.ArrayIndexOutOfBoundsException 异常的代码行
}
```

需要参考 numBytesForFirstByte 的代码来分析，offset 的计算是比较特殊的。

192 二进制为 0b11000000，是 UTF8 2字节情况下的手字节的最小值，这个就是方法名的由来，计算第一个字节到底是 UTF8 编码的哪种情况，就可以算出是几个字节。

bytesOfCodePointInUTF8 的值的含义就是这个，2字节编码第一个字节为 0b110xxxxx，即会有 2^5 个取值，所以 bytesOfCodePointInUTF8 的值最开始为 32 个 2。依次类推，2^4 个 3， 2^3 个 4， 2^2 个 5， 2 个 6。

这里面少了 UTF8 1字节的情况，因为 offset 1字节情况下均为负数，所以才有了 numBytesForFirstByte 代码的第二行。

至此，UTF8 编码的 6 种情况都处理完了。但是这里有个问题，就是没有处理异常情况，即编码中出现乱码，是有可能出现 0b1111111x 的情况，这个有两个取值，计算 offset 后为 62 和 63。

这里就是乱码导致异常的最终原因了。

所以，有一种简单暴力的修复方式，就是在 bytesOfCodePointInUTF8 后面多加两个 1。这个修复方式不会报异常，但是字节数的计算可能是有问题的。

新版的修复代码，可以参考 github 上的 [UTF8String.java](https://github.com/apache/spark/blob/master/common/unsafe/src/main/java/org/apache/spark/unsafe/types/UTF8String.java#L60-L65)，新版根据了新的规范进行了修正，逻辑更为复杂一些。

## UTF length 如何调用了 UTF8String 的 numChars

通过对代码的分析和查找，定位到了两处代码，可以解释如何调用到了 UTF8String 的 numChars。

```java
// copied from org.apache.spark.sql.functions in spark 2.1

/**
 * Computes the length of a given string or binary column.
 *
 * @group string_funcs
 * @since 1.5.0
 */
def length(e: Column): Column = withExpr { Length(e.expr) }

// copied from org.apache.spark.sql.catalyst.expressions.stringExpressions

/**
 * A function that return the length of the given string or binary expression.
 */
@ExpressionDescription(
  usage = "_FUNC_(expr) - Returns the length of `expr` or number of bytes in binary data.",
  extended = """
    Examples:
      > SELECT _FUNC_('Spark SQL');
       9
  """)
case class Length(child: Expression) extends UnaryExpression with ImplicitCastInputTypes {
  override def dataType: DataType = IntegerType
  override def inputTypes: Seq[AbstractDataType] = Seq(TypeCollection(StringType, BinaryType))

  protected override def nullSafeEval(value: Any): Any = child.dataType match {
    case StringType => value.asInstanceOf[UTF8String].numChars
    case BinaryType => value.asInstanceOf[Array[Byte]].length
  }

  override def doGenCode(ctx: CodegenContext, ev: ExprCode): ExprCode = {
    child.dataType match {
      case StringType => defineCodeGen(ctx, ev, c => s"($c).numChars()")
      case BinaryType => defineCodeGen(ctx, ev, c => s"($c).length")
    }
  }
}
```

这里需要说明一个 Spark 的优化，执行的时候会将 SQL 最终翻译为一份代码，然后使用 Janino 进行编译后执行，这样的好处是移除了大量无用的分支，效率会更高，这个是属于 Spark 2.0's Tungsten engine 的 Whole-stage code generation 优化。

对于 StringType 来说，就会最终调用到 UTF8String 的 numChars 方法。

这部分的优化非常有意思，后续有机会需要进一步去学习和了解。

# 总结

后续在网上查找资料的时候，发现这个问题已经修复了，但是整个分析过程还是比较有成就感的，也对 Spark 的一些内部实现有了了解，后续希望可以继续多学习和深入理解 Spark。

# 参考资料及延伸阅读

1. [Apache Spark as a Compiler: Joining a Billion Rows per Second on a Laptop](https://databricks.com/blog/2016/05/23/apache-spark-as-a-compiler-joining-a-billion-rows-per-second-on-a-laptop.html)