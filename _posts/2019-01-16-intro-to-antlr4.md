---
layout: post
title: Antlr4 简介
category: java
tags: ['java', 'antlr4']
---

# 简介

Antlr4 是一款强大的语法生成器工具，可用于读取、处理、执行和翻译结构化的文本或二进制文件。基本上是当前 Java 语言中使用最为广泛的语法生成器工具。Twitter搜索使用ANTLR进行语法分析，每天处理超过20亿次查询；Hadoop生态系统中的Hive、Pig、数据仓库和分析系统所使用的语言都用到了ANTLR；Lex Machina将ANTLR用于分析法律文本；Oracle公司在SQL开发者IDE和迁移工具中使用了ANTLR；NetBeans公司的IDE使用ANTLR来解析C++；Hibernate对象-关系映射框架（ORM）使用ANTLR来处理HQL语言。<sup>参考2</sup>

Antlr4 提供了大量的[官方 grammar 示例](https://github.com/antlr/grammars-v4/)，包含了各种常见语言，非常全面，提供了非常全面的学习教材。

本文简单介绍一个示例，实现一个简单的计算器功能，这个例子在很多资料中都作为第一个示例，可以算是 Antlr4 的 HelloWorld。

# 基本概念

语法分析器（parser）是用来识别语言的程序，本身包含两个部分：词法分析器（lexer）和语法分析器（parser）。词法分析阶段主要解决的关键词以及各种标识符，例如 INT、ID 等，语法分析主要是基于词法分析的结果，构造一颗语法分析树。大致的流程如下图<sup>参考2</sup>所示。

![语法解析基本流程](/assets/blog/antlr4/concept.png)

因此，为了让词法分析和语法分析能够正常工作，在使用 Antlr4 的时候，需要定义语法（grammar），这部分就是 Antlr 元语言。

![语法解析基本流程](/assets/blog/antlr4/parser-tree.png)

# 元语言

首先，要了解 antlr4 本身的定义 grammar 的语法，相对比较简单。我们以计算器的例子为例，简单讲解其中的概念。

```antlr4
// file: Calculator.g4
grammar Calculator;

line : expr EOF ;
expr : '(' expr ')'             # parenExpr
     | expr ('*'|'/') expr      # multOrDiv
     | expr ('+'|'-') expr      # addOrSubstract
     | FLOAT                    # float
     ;

WS : [ \t\n\r]+ -> skip;
FLOAT : DIGIT+ '.' DIGIT* EXPONET?
      | '.' DIGIT+ EXPONET?
      | DIGIT+ EXPONET?
      ;

fragment DIGIT : '0'..'9' ;
fragment EXPONET : ('e'|'E') ('+'|'-')? DIGIT+ ;
```

第一行，定义了 grammar 的名字，名字需要与文件名对应。

接下来的 line 和 expr 就是定义的语法，会使用到下方定义的词法，注意 # 后面的名字，是可以在后续访问和处理的时候使用的。一个语法有多种规则的时候可以使用 \| 来进行配置。

在 expr 这行，我们注意到四则运算分为了两个非常相似的语句，这样做的原因是为了实现优先级，乘除是优先级高于加减的。

WS 定义了空白字符，后面的 skip 是一个特殊的标记，标记空白字符会被忽略。

FLOAT 是定义的浮点数，包含了整数，与编程语言中的浮点数略有不同，更类似 Number 的定义。

最后的 fragment 定义了两个在词法定义中使用到的符号。

在语法定义的文件中，大部分的地方使用了正则表达式。

# 生成文件

配置 antlr4 工具，先从官网下载 Antlr4 的 jar 包，点击[下载地址](http://www.antlr.org/download/antlr-4.5-complete.jar)进行下载。

```bash
alias antlr4="java -jar /path/to/antlr-4.5-complete.jar"
```

通过命令行工具可以生成 lexer、parser、visitor、listener 等文件。

visitor 是默认不生成的，需要带上参数 -visitor。

```bash
$ antlr4 -visitor Calculator.g4

# 生成文件如下：
Calculator.interp
CalculatorBaseListener.java
CalculatorLexer.interp
CalculatorLexer.tokens
CalculatorParser.java
Calculator.tokens
CalculatorBaseVisitor.java
CalculatorLexer.java
CalculatorListener.java
CalculatorVisitor.java
```

# 使用 Visitor

Visitor 的使用是最为简单方便的，继承 CalculatorBaseVisitor 类即可，内部的方法与 g4 文件定义相对应，对照看即可理解。

```java
public class MyCalculatorVisitor extends CalculatorBaseVisitor<Object> {
    @Override
    public Object visitParenExpr(CalculatorParser.ParenExprContext ctx) {
        return visit(ctx.expr());
    }

    @Override
    public Object visitMultOrDiv(CalculatorParser.MultOrDivContext ctx) {
        Object obj0 = ctx.expr(0).accept(this);
        Object obj1 = ctx.expr(1).accept(this);

        if ("*".equals(ctx.getChild(1).getText())) {
            return (Float) obj0 * (Float) obj1;
        } else if ("/".equals(ctx.getChild(1).getText())) {
            return (Float) obj0 / (Float) obj1;
        }
        return 0f;
    }

    @Override
    public Object visitAddOrSubstract(CalculatorParser.AddOrSubstractContext ctx) {
        Object obj0 = ctx.expr(0).accept(this);
        Object obj1 = ctx.expr(1).accept(this);

        if ("+".equals(ctx.getChild(1).getText())) {
            return (Float) obj0 + (Float) obj1;
        } else if ("-".equals(ctx.getChild(1).getText())) {
            return (Float) obj0 - (Float) obj1;
        }
        return 0f;
    }

    @Override
    public Object visitFloat(CalculatorParser.FloatContext ctx) {
        return Float.parseFloat(ctx.getText());
    }
}
```

实现了 visitor 之后，就可以完成一个简单的计算器了。

```java
import org.antlr.v4.runtime.ANTLRInputStream;
import org.antlr.v4.runtime.CommonTokenStream;

public class Driver {
    public static void main(String[] args) {
        String query = "3.1 * (6.3 - 4.51) + 5 * 4";

        CalculatorLexer lexer = new CalculatorLexer(new ANTLRInputStream(query));
        CalculatorParser parser = new CalculatorParser(new CommonTokenStream(lexer));
        CalculatorVisitor visitor = new MyCalculatorVisitor();

        System.out.println(visitor.visit(parser.expr()));  // 25.549
    }
}
```

# 使用 Maven

Antlr4 提供了 [Maven Plugin](https://www.antlr.org/api/maven-plugin/latest/)，可以通过配置来进行编译。

语法文件 g4 放置在 src/main/antlr4 目录下即可，配置依赖的 antlr4 和 plugin 即可。

生成 visitor 在 plugin 配置 visitor 参数为 true 即可。

注意：antlr4 的库版本要与 plugin 版本对应，antlr4 对生成文件用的版本与库本身的版本会进行对照，不匹配会报错。

```xml
...
<properties>
    <antlr4.version>4.7.2</antlr4.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.antlr</groupId>
        <artifactId>antlr4</artifactId>
        <version>${antlr4.version}</version>
    </dependency>
</dependencies>
...
<build>
    <plugins>
        <plugin>
            <groupId>org.antlr</groupId>
            <artifactId>antlr4-maven-plugin</artifactId>
            <version>${antlr4.version}</version>
            <configuration>
                <visitor>true</visitor>
            </configuration>
            <executions>
                <execution>
                    <id>antlr</id>
                    <goals>
                        <goal>antlr4</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
...
```

# 总结

本文较为简单地说了一个计算器的例子，只介绍了 visitor 的大致使用方法，最后还介绍了 maven plugin 的使用方法。

笔者还在学习 antlr4 以及编译原理，想用好语法生成器工具，还是需要对编译原理有一定的理解。

本文的计算器实现代码可以在[这里](https://github.com/icejoywoo/antlr4-demo)上找到。

# 参考文档

1. [antlr](https://www.antlr.org/)
2. [ANTLR 4权威指南](https://book.douban.com/subject/27082372/)
3. [ANTLR快餐教程(2) - ANTLR其实很简单](https://www.jianshu.com/p/1f5e72156075)