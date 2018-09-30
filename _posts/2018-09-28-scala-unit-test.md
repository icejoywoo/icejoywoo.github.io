---
layout: post
title: Scala 的单测框架和示例（JUnit4 & ScalaTest）
category: scala
tags: ['scala', 'unit test']
---

随着下一代大数据计算框架 Spark 的流行，Scala 也受到了越来越多的关注。在 Scala 开发中，免不了需要编写单元测试，这样可以提升开发效率，方便地进行回归测试。在实际业务开发中，业务需求变更会引入大量的逻辑，通过单元测试可以很好地保障现有代码的逻辑依然符合预期，前提是单元测试的 case 覆盖较为全面。

本文主要介绍了两种单元测试的框架，一种是传统的 Java 的 JUnit4 框架，另一种是 Scala 比较常用的 ScalaTest 框架。针对两个框架，各自简单介绍，并提供示例代码，笔者使用中碰到的问题解决，希望可以帮到有需要的朋友。

# JUnit4

JUnit 是 Java 中最常用的单测框架，目前已经有 [JUnit5](https://junit.org/junit5/)，本文暂时只讨论 [JUnit4](https://junit.org/junit4/)，笔者还细致了解过 JUnit5。

在 Scala 中也可以使用与 Java 一样的 Annotation 的方式来标记测试方法。

```scala
import org.junit.Assert._
import org.junit._

class UsingJUnit {

  @Before
  def before(): Unit = {
    println("before test")
  }

  @After
  def after(): Unit = {
    println("after test")
  }

  @Test
  def testList(): Unit = {
    println("testList")
    val list = List("a", "b")

    assertEquals(List("a", "b"), list)
    assertNotEquals(List("b", "a"), list)
  }
}
```

断言的使用也基本和 Java 保持一致，Before 和 After 是在每个测试用例的前后执行。

JUnit4 还提供了 BeforeClass 和 AfterClass 在整个测试的前后执行一次，要求方法必须是 static 的。在 Java 中通过 static 关键字来定义，在 Scala 中需要实用伴生对象，定义一个 object 来实现 static 方法。

```scala
object UsingJUnit {
  @BeforeClass
  def beforeClass(): Unit = {
    println("before class")
  }

  @AfterClass
  def afterClass(): Unit = {
    println("after class")
  }
}
```

除了 static 的方法外，基本与 Java 保持了一致。

## JUnit 完整示例

{% gist 2c7b6960e4cbbacf901a8f57f951333b UsingJUnit.scala %}

# ScalaTest

ScalaTest 是 Scala 原生的单元测试框架，本身与 JUnit 没有太多相似之处，功能强大，目前笔者只了解到了少量功能，其他功能仍需继续探索。

ScalaTest 加入了很多的 DSL，使得测试的描述融合在代码中。先看一个示例（从 Scala 实用指南中的示例少许更改而来）

```scala
import org.scalatest._

class UsingScalaTest1 extends FlatSpec with Matchers {
  trait EmptyArrayList {
    val list = new java.util.ArrayList[String]
  }

  "a list" should "be empty on create" in new EmptyArrayList {
    list.size shouldBe 0
  }

  it should "increase in size upon add" in new EmptyArrayList {
    list.add("Milk")
    list add "Sugar"

    list.size should be(2)
  }
}
```

代码中对测试 case 的描述，会在执行后格式化输出到终端，这点非常方便，可以很方便地查看。

```bash
UsingScalaTest1:
a list
- should be empty on create
- should increase in size upon add
```

## maven 配置 plugin

在与 maven 继承的过程中，需要配置相应的插件才可以。参考资料 5。

```xml
...
<build>
    <plugins>
        ...
        <!-- disable surefire -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>2.7</version>
            <configuration>
                <skipTests>true</skipTests>
            </configuration>
        </plugin>

        <!-- enable scalatest -->
        <plugin>
            <groupId>org.scalatest</groupId>
            <artifactId>scalatest-maven-plugin</artifactId>
            <version>1.0</version>
            <configuration>
                <reportsDirectory>${project.build.directory}/surefire-reports</reportsDirectory>
                <junitxml>.</junitxml>
                <filereports>WDF TestSuite.txt</filereports>
            </configuration>
            <executions>
                <execution>
                    <id>test</id>
                    <goals>
                        <goal>test</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
...
```

需要说明的是 disable surefire 这步，其实可以不用，这样可以将 JUnit 和 ScalaTest 的测试用例都跑一下，并不冲突。

## trait 的用法

ScalaTest 提供了大量的 trait，可以使用各类的功能，本文只介绍其中三种：BeforeAndAfter、BeforeAndAfterAll 和 GivenWhenThen。

BeforeAndAfter 可以实现与 JUnit 的 Before 和 After 相同的功能，在每个测试用例的前后执行。类似的，BeforeAndAfterAll 就是与 JUnit 的 BeforeClass 和 AfterClass 一致。

GivenWhenThen 是 ScalaTest 特有的，是用来对 case 内部的细节进行描述的，最终会被格式化输出到终端中。

下面通过几个代码示例来了解其具体用法。

### BeforeAndAfter

```scala
class UsingBeforeAndAfter extends FlatSpec with BeforeAndAfter with Matchers {

  var list: java.util.List[String] = _

  before {
    println("before")
    list = new java.util.ArrayList[String]
  }

  after {
    println("after")
    if (list != null) {
      list = null
    }
  }

  "a list" should "be empty on create" in {
    list.size shouldBe 0
  }

  it should "increase in size upon add" in {
    list.add("Milk")
    list add "Sugar"

    list.size should be(2)
  }
}
```

测试的输出如下

```bash
before
after
before
after
UsingBeforeAndAfter:
a list
- should be empty on create
- should increase in size upon add
```

before 和 after 打印了两次，因为每个测试 case 的前后都需要执行一次。

### BeforeAndAfterAll

```scala
class UsingBeforeAndAfterAll extends FlatSpec with BeforeAndAfterAll with Matchers {

  var list: java.util.List[String] = _

  override def beforeAll(): Unit = {
    println("before all...")
    list = new java.util.ArrayList[String]
    super.beforeAll()
  }

  override def afterAll(): Unit = {
    println("after all...")
    if (list != null) {
      list = null
    }
    super.afterAll()
  }

  "a list" should "be empty on create" in {
    list.size shouldBe 0
  }

  it should "increase in size upon add" in {
    list.add("Milk")
    list add "Sugar"

    list.size should be(2)
  }
}
```

测试的输出如下

```bash
before all...
after all...
UsingBeforeAndAfterAll:
a list
- should be empty on create
- should increase in size upon add
```

before all 和 after all 只打印了一次，因为这个是 test suite 中只执行一次。

### GivenWhenThen

```scala
class UsingGivenWhenThen extends FlatSpec with GivenWhenThen with Matchers {
  trait EmptyArrayList {
    val list = new java.util.ArrayList[String]
  }

  "a list" should "be empty on create" in new EmptyArrayList {
    Given("a empty list")
    Then("list size should be 0")
    list.size shouldBe 0
  }

  it should "increase in size upon add" in new EmptyArrayList {
    Given("a empty list")

    When("add 2 elements")
    list.add("Milk")
    list add "Sugar"

    Then("list size should be 2")
    list.size should be(2)
  }
}
```

输出如下：

```bash
UsingGivenWhenThen:
a list
- should be empty on create
  + Given a empty list
  + Then list size should be 0
- should increase in size upon add
  + Given a empty list
  + When add 2 elements
  + Then list size should be 2
```

我们可以看到通过使用 Given、When、Then 三个方法，可以对最终的输出有影响，描述性更强，三段式的描述可以满足大多数场景。

## ScalaTest 完整示例

{% gist 2c7b6960e4cbbacf901a8f57f951333b UsingScalaTest.scala %}

# 总结

本文的示例相对比较简单，对于当前笔者的需求来说是足够的，以实用和快速上手为主，更为细致的功能，还需要继续学习和探索。

# 参考资料

1. [JUnit4](https://junit.org/junit4/)
2. [ScalaTest](http://www.scalatest.org/)
3. [Scala and Apache Spark in Tandem as a Next-Generation ETL Framework](https://www.red-gate.com/simple-talk/sql/bi/scala-apache-spark-tandem-next-generation-etl-framework/)
4. [Scala 实用指南 - 第16章 单元测试](https://book.douban.com/subject/30249691/)
5. [Using the ScalaTest Maven plugin](http://www.scalatest.org/user_guide/using_the_scalatest_maven_plugin)