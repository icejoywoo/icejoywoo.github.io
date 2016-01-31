---
layout: post
title: Maven的常用命令整理
category: java
tags: ['java', 'maven']
---

maven的几个生命周期, lifecycle

compile
package
test

1. 执行某个类

```bash
mvn exec:java -Dexec.mainClass="com.example.Main" -Dexec.args="arg0 arg1 arg2" -Dexec.classpathScope=runtime
```

引用内部的文章
[Python知识点整理]({% post_url 2015-07-25-brief-python %})
