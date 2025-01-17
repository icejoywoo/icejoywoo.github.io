---
layout: post
title: JNI 使用笔记
category: Java
tags: ['Java', 'JNI']
---

# 简介

JNI 的全称是 Java Native Interface，是一种 Java 的 Native 编程接口，支持 Java 与 C/C++ 直接相互调用，从 JDK 1.0 开始提供。

> The JNI is a native programming interface. It allows Java code that runs inside a Java Virtual Machine (VM) to interoperate with applications and libraries written in other programming languages, such as C, C++, and assembly.
> The most important benefit of the JNI is that it imposes no restrictions on the implementation of the underlying Java VM. Therefore, Java VM vendors can add support for the JNI without affecting other parts of the VM. Programmers can write one version of a native application or library and expect it to work with all Java VMs supporting the JNI.

参考：[JNI ch1. Introduction](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/intro.html)


# 基本使用流程

JNI 的使用非常的简单，下面就通过轻松五步走，来完成一个 JNI 的调用。

## 1. native method

定义一个 Java 类，其中包含 native 方法，另外通过 loadLibrary 来加载动态库。

```java
package jni;

class JniDemo {
  static {
    System.loadLibrary("jnidemo");
  }
  
  public native void nativeMethod();
}
```

额外说明：
1. 动态库需要在 java 启动参数的 -Djava.library.path= 中定义，否则会报动态库找不到的错误
2. 对于苹果的 M1 电脑，需要额外注意动态库是属于那种架构（aarch64 和 x86_64），需要与使用的 jdk 保持一致

## 2. generate header

JDK 默认自动的工具可以生成头文件

```bash
# 1. javac -h：java 编译为 class，并且生成头文件
${JAVA_HOME}/bin/javac -h . jni/JniDemo.java

# 2. javah：需要在 classpath 下找到已经编译好的 class
${JAVA_HOME}/javah jni.JniDemo
```

生成的头文件示例如下:

```cpp
// filename: jni_JniDemo.h
/* DO NOT EDIT THIS FILE - it is machine generated */
#include <jni.h>
/* Header for class jni_JniDemo */

#ifndef _Included_jni_JniDemo
#define _Included_jni_JniDemo
#ifdef __cplusplus
extern "C" {
#endif
/*
 * Class:     jni_JniDemo
 * Method:    nativeMethod
 * Signature: ()V
 */
JNIEXPORT void JNICALL Java_jni_JniDemo_nativeMethod
  (JNIEnv *, jobject);

#ifdef __cplusplus
}
#endif
#endif
```

这里的 extern "C" 主要是为了保证在 c++ 的情况下，其函数名不被改写，保留原始函数名。 

## 3. implementation

引入头文件，实现其对应的函数

```cpp
// filename: JniDemo.cc
#include "jni_JniDemo.h"

JNIEXPORT void JNICALL Java_jni_JniDemo_nativeMethod
  (JNIEnv *env, jobject obj) {
  printf("native method in jni\n");
}
```

## 4. compile

编译只需要依赖 jni.h 的头文件，还有一个与OS相关的头文件，参考[Guide to JNI (Java Native Interface)](https://www.baeldung.com/jni)具体使用如下。

这里编译的动态库的名字，与 Java 代码中的 System.loadLibrary 的动态库名字相关，额外多一个 lib 的前缀。

```bash
# for mac os
g++ -c -fPIC -I${JAVA_HOME}/include -I${JAVA_HOME}/include/darwin JniDemo.cc -o JniDemo.o
g++ -shared -fPIC -o libjnidemo.dylib JniDemo.o -lc

# for linux
g++ -c -fPIC -I${JAVA_HOME}/include -I${JAVA_HOME}/include/linux JniDemo.cc -o JniDemo.o
g++ -dynamiclib -o libjnidemo.so JniDemo.o -lc
```

## 5. run

执行的时候只需要指定 java.library.path，在这个路径下有 libjnidemo 动态库即可

```bash
# run
java -cp . -Djava.library.path=/path/to/libjnidemo jni.JniDemo
```

# JNI 基本介绍

在 JNI 中均通过 JNIEnv 来对 Java class 中的 field 和 method 进行访问，很多的 API 都需要涉及到 Type Signature，所以这里先介绍下 JVM 定义的 Type Signature。

JNI 整体的 API 都比较原始，很容易上手，只是使用比较繁琐。

Type Signature 主要参考[Chapter 3: JNI Types and Data Structures](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/types.html)。

## JNI Primitive Types

Java 的 Primitive Types 与 JNI 中的 Native 都有对应的类型，规律比较明显，在 JNI 都是以 j 开头。除了基础类型外，都是 jobject。

这里在 Java 中定义 native 方法，其参数的类型都会被转换为对应的 native 类型。

Primitive Types 和 Native 的对应关系

| Java Type | Native Type |    Description   |
|:---------:|:-----------:|:----------------:|
| boolean   | jboolean    | unsigned 8 bits  |
| byte      | jbyte       | signed 8 bits    |
| char      | jchar       | unsigned 16 bits |
| short     | jshort      | signed 16 bits   |
| int       | jint        | signed 32 bits   |
| long      | jlong       | signed 64 bits   |
| float     | jfloat      | 32 bits          |
| double    | jdouble     | 64 bits          |
| void      | void        | not applicable   |


### jobject

除基础类型外，其余的类型均为 jobject，包括 java class、String、array 类型。

jobject:
* jclass (java.lang.Class objects)
* jstring (java.lang.String objects)
* jarray (arrays)
  * jobjectArray (object arrays)
  * jbooleanArray (boolean arrays)
  * jbyteArray (byte arrays)
  * jcharArray (char arrays)
  * jshortArray (short arrays)
  * jintArray (int arrays)
  * jlongArray (long arrays)
  * jfloatArray (float arrays)
  * jdoubleArray (double arrays)
* jthrowable (java.lang.Throwable objects)

额外说明：
1. String 有单独的 jstring：String 有 jstring 的实现，属于 jobject，其对应的 array 是 jobjectarray，而没有像基础类型那样有单独的 array 类型。
2. 基础类型的 array 是单独的类型：Java 中的基础类型和基础类型的数组是两个类型，JNI 底层也确实是两个不同的实现。

## Java VM Type Signatures

JVM 标准中有一套 Type Signatures，通过这套签名体系来表示 field 的类型、method 的签名、array 等。

在 JNI 获取 field 和 method 等处均需要使用 Type Signature。这里的 Type Signature 是 Java 单独定义的，与其他实现没有直接关系（例如，与 c-style print format 格式也无关）。

Java VM Type Signatures 的表格如下：

|       Type Signature      |       Java Type       |
|:-------------------------:|:---------------------:|
| Z                         | boolean               |
| B                         | byte                  |
| C                         | char                  |
| S                         | short                 |
| I                         | int                   |
| J                         | long                  |
| F                         | float                 |
| D                         | double                |
| L fully-qualified-class ; | fully-qualified-class |
| [ type                    | type[]                |
| ( arg-types ) ret-type    | method type           |

### 读取Field的示例

这里简单举例说一下 Type Signature 的使用方法。

假设有一个 Java class 的定义如下：

```java
public class SimpleData {
  public boolean aBoolean;
  public String aString;
}
```

我们需要在 JNI 中读取这个类的字段，这时就需要使用 Type Signature，使用示例如下：

```cpp

jclass kDummyDataClass = env->FindClass("LSimpleData;");

jfieldID data_aBoolean_ = env->GetFieldID(kDummyDataClass, "aBoolean", "Z");
jfieldID data_aString_ = env->GetFieldID(kDummyDataClass, "aString", "Ljava/lang/String;");

// 假设当前已经有 jobject dataObject，其对应的 java class 为 SimpleData
jboolean aBoolean = env->GetBooleanField(dataObject, data_aBoolean_);

// jstring 有单独的实现，但是其本质也是一个 jobject
jstring aString = (jstring) env->GetObjectField(dataObject, data_aString_);
```

## 调用 Java Method

JNI 也可以来访问 Java 的 method，只要先获取 jmethodID，就可以进行调用了，也是非常的简单。

这里参考 gandiva 的 VectorExpander，进行了一些简化。

假设 java 类 VectorExpander 如下，有一个 expandOutputVector 方法：

```java
class VectorExpander {
  // ...
  long expandOutputVector(long toCapacity) {
    // ...
  }
}
```

首先，先获取 jmethodID。

```cpp
jclass vector_expander_class_ = env->FindClass("Lpath/to/VectorExpander;");
// (J)J 表示参数列表为 long，返回值也为 long 的函数签名
jmethodID vector_expander_method_ = env->GetMethodID(vector_expander_class_, "expandOutputVector", "(J)J");
```

通过 jmethodID 就可以对方法进行调用了。

```cpp
// 假设传入一个 jobject jexpander_，其对应的 java 类为 VectorExpander
// 通过调用 CallObjectMethod 来完成方法的调用
jlong ret = env->CallObjectMethod(jexpander_, vector_expander_method_, to_capacity);
```

## JNI_Onload 和 JNI_OnUnload

看名字就知道，这两个方法是 JNI 在动态库 load 和 unload 的回调函数，含义为：
* JNI_Onload 在JNI动态库被加载的时候调用，这个方法主要的用途就是进行动态库的全局初始化
* JNI_OnUnload 在加载 JNI 动态库的 classloader 被gc回收的时候，会调用，对于全局状态进行清理

参考[官方文档](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/invocation.html#JNJI_OnLoad)中查看更详细的解释。

可以参考 arrow gandiva [jni_common.cc](https://github.com/apache/arrow/blob/release-8.0.0/cpp/src/gandiva/jni/jni_common.cc) 的实现，JNI_Onload 和 JNI_OnUnload 就对应的是全局状态的初始化和全局状态的清理。

# 最佳实践

这里是一些使用的实践经验，主要是借鉴了 Arrow 项目中的部分代码。

## JNI 动态库的加载方式

加载的方式大致有两种：
1. java.library.path下读取：在 class 的 static block 中，使用 System.loadLibrary 来读取
2. cp路径下读取：在 classpath 中通过 resource 的方式读取动态库的内容，再写入临时文件，最后通过 System.load 来加载动态库

两种方法的优缺点刚好相反，目前大多数都采用第二种方法。
* 第一种方法的好处是逻辑简单直接，缺点是需要在启动 jvm 的时候设置 java.library.path，这样就需要使用者感知到 JNI 的存在，无法打包到 jar 中。
* 第二种方法的缺点是逻辑相对复杂一些，优点是使用者不需要知道 JNI 的存在，可以打包到 jar 中。

这里我们参考 arrow 的 [JniLoader.java](https://github.com/apache/arrow/blob/release-8.0.0/java/c/src/main/java/org/apache/arrow/c/jni/JniLoader.java)，其 load 方法如下：

```java
  private void load(String name) {
    final String libraryToLoad = System.mapLibraryName(name);
    try {
      // 从 classpath 中读取 jni 动态库的内容，写入到临时文件中
      File temp = File.createTempFile("jnilib-", ".tmp", new File(System.getProperty("java.io.tmpdir")));
      try (final InputStream is = JniWrapper.class.getClassLoader().getResourceAsStream(libraryToLoad)) {
        if (is == null) {
          throw new FileNotFoundException(libraryToLoad);
        }
        Files.copy(is, temp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        // 从临时文件中 load 动态库
        System.load(temp.getAbsolutePath());
      }
    } catch (IOException e) {
      throw new IllegalStateException("error loading native libraries: " + e);
    }
  }
```

## CMake 编译

这里的编译方法可以参考 Arrow 的 [c data api](https://github.com/apache/arrow/blob/release-8.0.0/java/c/CMakeLists.txt) 和 [gandiva](https://github.com/apache/arrow/blob/release-8.0.0/java/gandiva/CMakeLists.txt) 的编译。

下面是一个 CMake 的示例，通过 add_jar 来生成 jni 的头文件。

```cmake
# Find java/jni
include(UseJava) # for add_jar

find_package(Java REQUIRED)
find_package(JNI REQUIRED)

# add_jar DESTINATION：生成的 java native method 的头文件位置
set(JNI_HEADERS_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated")

# 设置 jni 的头文件
include_directories(${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}
                    ${JNI_INCLUDE_DIRS} ${JNI_HEADERS_DIR})

# 生成 jar 包，包含参数中的 java 文件，这个 jar 后续不使用
# 在 ${JNI_HEADERS_DIR} 目录下，生成 native method 的 jni header，这里就是 jni_JniWrapper.h
add_jar(${PROJECT_NAME}
        src/main/java/jni/JniException.java
        src/main/java/jni/JniWrapper.java
        GENERATE_NATIVE_HEADERS
        hello_jni-native
        DESTINATION
        ${JNI_HEADERS_DIR})

# 编译生成动态库
set(SOURCES src/main/cpp/jni_wrapper.cc)
add_library(hello_jni SHARED ${SOURCES})
target_link_libraries(hello_jni ${JAVA_JVM_LIBRARY})
```

说明：
* 因为 native method 一般变更也不频繁，制定好 api 后是不需要变更的，简化的逻辑是可以变更的时候重新生成一次，这样逻辑可以更简单。
* jni 动态库只需要依赖 jni 头文件即可

参考：
* [CMake FindJNI](https://cmake.org/cmake/help/latest/module/FindJNI.html)
* [CMake UseJava](https://cmake.org/cmake/help/latest/module/UseJava.html)

## C/C++ API 差异

为什么需要了解二者的差异？因为网络上搜索的大量 jni 的资料（android jni的资料更多一些），有些是 C，有些是 C++，看到同一个函数两种用法，会感到困惑。这里简单解释了二者的差异，方便读者更好地阅读网上各类资料。

API 的差异主要是因为 C++ 支持 class（struct 与 class 的差异仅仅是可见性，struct 默认是 public，class 默认为 private），C 只能用 struct + function pointer 来实现，这样也就导致了二者的使用方法上存在差异，但是函数名是完全一样的。

jni.h 中，对 JNIEnv 的定义如下：

```c
#ifdef __cplusplus
typedef JNIEnv_ JNIEnv;
#else
typedef const struct JNINativeInterface_ *JNIEnv;
#endif
```

虽然同为 JNIEnv，但是其内部的实现是不同的，查看对应类即可知道 C/C++ API 的差异，这里以 GetStringUTFChars 为例举例说明其 API 的差异：

```cpp
// c api
const char *str = (*env)->GetStringUTFChars(env, jstr, 0);

// c++ api
const char *str = env->GetStringUTFChars(jstr, 0);
```

## Arrow JNI

JNI 动态库的编译都是使用 CMake 来进行编译，JniLoader 用于加载动态库，JniWrapper 作为 native method 的类。

下面以 Arrow Gandiva 为例，简单分析下其 JNI 实现：
1. 数据传输的方式为 JVM 堆外内存（从 Netty 申请的），向 JNI 传递数据 input 和 output 的时候使用 buffer address + length 的方式
2. JVM 堆外内存本质是需要在 Java 侧进行内存的管理，所以在 JNI 中如果需要进行内存扩容（project 场景下，output 的内存可能需要扩容），会在 C++ 中调用 Java 的 VectorExpander 来进行扩容，保证内存全在 Java 中进行申请管理

相关主要代码如下：
* [Arrow C Data API](https://github.com/apache/arrow/blob/release-8.0.0/java/c/README.md)
    * [jni_wrapper.cc](https://github.com/apache/arrow/blob/release-8.0.0/java/c/src/main/cpp/jni_wrapper.cc)
    * [JniWrapper.java](https://github.com/apache/arrow/blob/release-8.0.0/java/c/src/main/java/org/apache/arrow/c/jni/JniWrapper.java)
* [Arrow Gandiva](https://github.com/apache/arrow/blob/release-8.0.0/java/gandiva/README.md)
    * [jni_common.cc](https://github.com/apache/arrow/blob/release-8.0.0/cpp/src/gandiva/jni/jni_common.cc)
    * [JniWrapper.java](https://github.com/apache/arrow/blob/release-8.0.0/java/gandiva/src/main/java/org/apache/arrow/gandiva/evaluator/JniWrapper.java)

方法的名字都是一样的，C/C++ API 下的函数是一样的，仅使用方法不同。

另外，Arrow 的 dataset 部分是通过封装 jni 在 java 提供了其对应的 c++ 实现，内存的管理都在 c++ 中，而 gandiva 刚好相反，内存全部在 java 中管理。

# 参考资料

本文涉及的示例均在 [github](https://github.com/icejoywoo/java_jni_demo) 中。

## Java

* [Java Native Interface Specification Contents](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/jniTOC.html)

## CMake

* [CMake FindJNI](https://cmake.org/cmake/help/latest/module/FindJNI.html)
* [CMake UseJava](https://cmake.org/cmake/help/latest/module/UseJava.html)

