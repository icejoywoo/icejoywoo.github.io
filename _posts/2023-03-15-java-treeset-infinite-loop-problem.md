---
layout: post
title: TreeSet 并发写入后可能导致读取死循环
category: Java
tags: ['Java', 'TreeSet', 'Java Collections']
---

# 概述

Java 中的内置集合类型有很多是非线程安全的，本文主要是介绍 TreeSet 在多线程并发写入后可能会导致 iterator 读取死循环的问题。

本文主要是介绍复现问题的方法，做一个简单的记录。出现死循环的原因是因为 TreeSet 底层是 TreeMap 实现的，数据结构是红黑树，红黑树在并发写入后，可能会出现 loop 的情况。

另外，HashMap 在多线程下也会有类似的问题，主要是由于 HashMap 解决哈希冲突的方法是链表法，链表在并发修改后可能会出现死循环。

# 复现

两个步骤：
1. 启动两个线程并发对 TreeSet 进行 add 操作
2. 通过 iterator 来进行遍历，判断是否有死循环，简单的方法就是循环的次数超过了之前 add 的个数就可以认为有死循环了

测试复现代码如下：

```java
import java.util.TreeSet;

public class TreeSetInfiniteLoop {

  public static void main(String[] args) throws InterruptedException {

    for (int attempt = 0; true; attempt++) {
      Set<Integer> set = new TreeSet<>();

      Thread t1 = new Thread(() -> {
        for (int i = 0; i < 90; i++) {
          for (int j = 0; j < 10; j++) {
            try {
              set.add(j);
            } catch (Exception e) {
              // ignore
            }
          }
        }
      });

      Thread t2 = new Thread(() -> {
        for (int i = 90; i < 100; i++) {
          for (int j = 0; j < 10; j++) {
            try {
              set.add(j);
            } catch (Exception e) {
              // ignore
            }
          }
        }
      });
      t1.start();
      t2.start();
      t1.join();
      t2.join();

      Thread t3 = new Thread(() -> {
        int counter = 0;
        for (Integer value : set) {
          counter++;
          if (counter > 100) {
            System.out.println("infinite loop found.");
            System.exit(-1);
          }
        }
      });
      t3.start();
      t3.join();

      if (attempt % 100 == 0) {
        System.out.println(String.format("attempting %d ...", attempt));
      }
    }
  }
}

```

在执行这个方法的时候，发现会出现2种报错的情况：
1. 出现死锁，然后检测发现
2. 并发 add 的时候，有可能会报 NPE 错误

# 修复

目前比较简单的方式是直接使用 Collections.synchronizedSet 把 set 包起来，这样在修改的方法上就都加上了锁，可以保证多线程安全。

# 总结

在使用这类线程不安全的集合需要注意下，这类问题一旦出现不太容易定位，需要重新 review 代码，设计构造合适的复现场景，因为多线程问题都存在偶发性，不一定可以复现，导致问题的定位会更加难。


# 参考资料

1. [writing to a java treemap concurrently can lead to an infinite loop during reads](https://ivoanjo.me/blog/2018/07/21/writing-to-a-java-treemap-concurrently-can-lead-to-an-infinite-loop-during-reads/)
2. [记一次TreeSet多线程环境死循环问题](https://blog.csdn.net/fanxl10/article/details/118603541)
3. [HashMap 多线程下死循环分析及JDK8修复](https://cloud.tencent.com/developer/article/1120823)