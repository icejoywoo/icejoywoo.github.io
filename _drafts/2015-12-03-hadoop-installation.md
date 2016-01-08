---
layout: post
title: Hadoop 集群部署简易指南
category: hadoop
tags: ['hadoop']
---

# 简介

使用的环境说明：

1. 操作系统：CentOS 6.3
2. Java 版本：jdk1.7.0_79
3. Hadoop 版本：2.6.0
4. Hive 版本：1.2.1
5. Spark 版本：1.5.2

HUE 安装配置


# 源码编译

## Hadoop 编译

$ mvn package -Pdist,native -DskipTests -Dtar

Mac 下编译 Hadoop 2.6.0 的问题

编译步骤：

protobuf 2.5.0，下载编译安装，protoc 添加到 PATH 中。

```bash
$ cd hadoop-maven-plugins
$ mvn install

$ cd ..
$ mvn eclipse:eclipse -DskipTests
```

http://wiki.apache.org/hadoop/EclipseEnvironment

> Exception in thread "main" java.lang.AssertionError: Missing tools.jar at: /Library/Java/JavaVirtualMachines/jdk1.7.0_15.jdk/Contents/Home/Classes/classes.jar

解决方法：

```bash
# 请将 jdk 的名字进行替换
$ sudo mkdir /Library/Java/JavaVirtualMachines/jdk1.7.0_15.jdk/Contents/Home/Classes/
$ sudo ln -s /Library/Java/JavaVirtualMachines/jdk1.7.0_15.jdk/Contents/Home/jre/lib/rt.jar /Library/Java/JavaVirtualMachines/jdk1.7.0_15.jdk/Contents/Home/Classes/classes.jar
```

1. [java.lang.AssertionError: Missing tools.jar](https://issues.apache.org/jira/browse/HADOOP-9350)

## Spark 编译

$ ./make-distribution.sh --name uts-spark --tgz -Phadoop-2.6 -Pyarn -Dhadoop.version=2.6.0 -DskipTests -Phive -Phive-thriftserver

测试

## HUE 编译

yum install -y libxslt-devel libxml2-devel openldap-devel

# 配置文件

1. jps pid文件的问题：

# 安装部署

## Hive Server 2

nohup hive --service hiveserver2 >> log/hiveserver2.log 2>&1 < /dev/null &

https://cwiki.apache.org/confluence/display/Hive/Setting+Up+HiveServer2

HUE spark

https://github.com/cloudera/hue/tree/master/apps/spark/java

# FAQ

## Hive 启动报错

### ${system:java.io.tmpdir}

> Caused by: java.net.URISyntaxException: Relative path in absolute URI: ${system:java.io.tmpdir%7D/$%7Bsystem:user.name%7D

http://stackoverflow.com/questions/27099898/java-net-urisyntaxexception-when-starting-hive


### jline 版本问题

>[ERROR] Terminal initialization failed; falling back to unsupported
>java.lang.IncompatibleClassChangeError: Found class jline.Terminal, but interface was expected
>	at jline.TerminalFactory.create(TerminalFactory.java:101)
>	at jline.TerminalFactory.get(TerminalFactory.java:158)
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:229)
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:221)
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:209)
>	at org.apache.hadoop.hive.cli.CliDriver.setupConsoleReader(CliDriver.java:787)
>	at org.apache.hadoop.hive.cli.CliDriver.executeDriver(CliDriver.java:721)
>	at org.apache.hadoop.hive.cli.CliDriver.run(CliDriver.java:681)
>	at org.apache.hadoop.hive.cli.CliDriver.main(CliDriver.java:621)
>	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
>	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:57)
>	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
>	at java.lang.reflect.Method.invoke(Method.java:606)
>	at org.apache.hadoop.util.RunJar.run(RunJar.java:221)
>	at org.apache.hadoop.util.RunJar.main(RunJar.java:136)
>
>Exception in thread "main" java.lang.IncompatibleClassChangeError: Found class jline.Terminal, but interface was expected
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:230)
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:221)
>	at jline.console.ConsoleReader.<init>(ConsoleReader.java:209)
>	at org.apache.hadoop.hive.cli.CliDriver.setupConsoleReader(CliDriver.java:787)
>	at org.apache.hadoop.hive.cli.CliDriver.executeDriver(CliDriver.java:721)
>	at org.apache.hadoop.hive.cli.CliDriver.run(CliDriver.java:681)
>	at org.apache.hadoop.hive.cli.CliDriver.main(CliDriver.java:621)
>	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
>	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:57)
>	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
>	at java.lang.reflect.Method.invoke(Method.java:606)
>	at org.apache.hadoop.util.RunJar.run(RunJar.java:221)
>	at org.apache.hadoop.util.RunJar.main(RunJar.java:136)

http://stackoverflow.com/questions/28997441/hive-startup-error-terminal-initialization-failed-falling-back-to-unsupporte
