---
layout: post
title: Mac 编译 Apache Arrow Java
category: big data
tags: ['apache arrow']
---

Apache Arrow 是一个内存的列式存储格式，其生态已经非常丰富，包含了计算引擎（gandiva、arrow compute layer等，计算向量化）、IPC 格式、网络传输 flight等。

Arrow 文档相对较少，java 包含了 jni 的部分，导致需要额外编译 jni 动态库。

本文介绍了在 Mac 下 Apache Arrow java 项目的编译流程以及一些常见问题。

本文环境说明：
* java version: 1.8.0_311
* maven version: 3.8.5 (3599d3414f046de2324203b78ddcf9b5e4388aa0)
* Mac OS 12.3.1
* arrow master分支，版本：9.0.0 commit: 3a646b35b29e52ca8eca995eb83af29c44b191c4

## 编译 java jni

arrow java 的 jni 分为两个部分：
* arrow c data structure
* arrow jni: 包含 gandiva、dataset、orc 三个部分的 jni

### 准备环境

```bash
# 在 arrow 目录下执行
$ cd path/to/arrow

# 通过 brew 安装所有依赖，可以查看 cpp/Brewfile 来查看其依赖
$ brew bundle --file=cpp/Brewfile
Homebrew Bundle complete! 25 Brewfile dependencies now installed.
```

关于 homebrew 的部分，可以去[官网](https://brew.sh/)去进行安装，通过 brew 可以非常方便的安装编译所需要的环境。

下载速度比较慢，时间较长，请耐心等待。

### build c data jni

```bash
# 在 arrow 目录下执行
$ cd path/to/arrow

$ mkdir -p java-dist java-native-c
$ cd java-native-c

$ cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_LIBDIR=lib \
    -DCMAKE_INSTALL_PREFIX=../java-dist \
    ../java/c

# 这一步会进行编译，稍等片刻
$ cmake --build . --target install
```

编译完成后，会在 `../java-dist/lib` 有一个 `libarrow_cdata_jni.dylib`


### build cpp jni (gandiva, dataset, orc)

```bash
# 在 arrow 目录下执行
$ cd path/to/arrow

$ mkdir -p java-dist java-native-cpp
$ cd java-native-cpp
$ cmake \
    -DARROW_BOOST_USE_SHARED=OFF \
    -DARROW_BROTLI_USE_SHARED=OFF \
    -DARROW_BZ2_USE_SHARED=OFF \
    -DARROW_GFLAGS_USE_SHARED=OFF \
    -DARROW_GRPC_USE_SHARED=OFF \
    -DARROW_LZ4_USE_SHARED=OFF \
    -DARROW_OPENSSL_USE_SHARED=OFF \
    -DARROW_PROTOBUF_USE_SHARED=OFF \
    -DARROW_SNAPPY_USE_SHARED=OFF \
    -DARROW_THRIFT_USE_SHARED=OFF \
    -DARROW_UTF8PROC_USE_SHARED=OFF \
    -DARROW_ZSTD_USE_SHARED=OFF \
    -DARROW_JNI=ON \
    -DARROW_PARQUET=ON \
    -DARROW_FILESYSTEM=ON \
    -DARROW_DATASET=ON \
    -DARROW_GANDIVA_JAVA=ON \
    -DARROW_GANDIVA_STATIC_LIBSTDCPP=ON \
    -DARROW_GANDIVA=ON \
    -DARROW_ORC=ON \
    -DARROW_PLASMA_JAVA_CLIENT=ON \
    -DARROW_PLASMA=ON \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_LIBDIR=lib \
    -DCMAKE_INSTALL_PREFIX=../java-dist \
    -DCMAKE_UNITY_BUILD=ON \
    -Dre2_SOURCE=BUNDLED \
    -DBoost_SOURCE=BUNDLED \
    -Dutf8proc_SOURCE=BUNDLED \
    -DSnappy_SOURCE=BUNDLED \
    -DORC_SOURCE=BUNDLED \
    -DZLIB_SOURCE=BUNDLED \
    ../cpp

# 编译时间比较久，耐心等待
$ cmake --build . --target install
```

编译完成后会有3个动态库：
* libarrow_dataset_jni.dylib
* libarrow_orc_jni.dylib
* libgandiva_jni.dylib


## 编译 java project

only arrow-c-data:

```bash
$ mvn -Darrow.c.jni.dist.dir=../java-dist/lib -Parrow-c-data clean install -Drat.skip=true
```

only arrow-jni:

```bash
$ mvn -Darrow.cpp.build.dir=../java-dist/lib -Parrow-jni clean install -Drat.skip=true
```

arrow-c-data 和 arrow-jni 一起编译的时候会报错，分别编译是可以的。官方文档也是分开编译的。

## 编译碰到的问题

### unapproved license 报错

如果 mvn 编译报下面错误的时候，请在 mvn 中添加配置 `-Drat.skip=true`
```
Too many files with unapproved license: 1 See RAT report in: /Users/icejoywoo/git/arrow/java/target/rat.txt
```

### jni 动态库找不到的问题

jni 动态库的查找逻辑是在 classpath 中，默认编译的目录是在 `../java-dist/lib` 中，这个目录默认不在其中，导致无法找到动态库。

下面提供一种方法，可以将动态库拷贝到对应项目的 test resources 文件夹中。

```
c/src/test/resources/libarrow_cdata_jni.dylib
gandiva/src/test/resources/libgandiva_jni.dylib
adapter/orc/src/test/resources/libarrow_orc_jni.dylib
adapter/orc/src/test/resources/libarrow_cdata_jni.dylib
dataset/src/test/resources/libarrow_dataset_jni.dylib
```

也可以使用下面的脚本，在 java 目录下执行即可。

```bash
#!/bin/bash
# file: update_jni_lib.sh

CURRENT_DIR=$(cd `dirname $0`; pwd)

cd ${CURRENT_DIR}

function link_jni_lib()
{
  dst=$1
  name=$2
  mkdir -p ${dst}
  cd ${dst}
  rm -f ${name}
  ln -s ${CURRENT_DIR}/../java-dist/lib/${name} ${name}
  file ${name}
  if [[ $? -ne 0 ]] ; then
    echo "failed to link jni lib ${name}"
  fi
  cd ${CURRENT_DIR}
}

link_jni_lib c/src/test/resources/ libarrow_cdata_jni.dylib
link_jni_lib gandiva/src/test/resources/ libgandiva_jni.dylib
link_jni_lib adapter/orc/src/test/resources/ libarrow_orc_jni.dylib
link_jni_lib adapter/orc/src/test/resources/ libarrow_cdata_jni.dylib
link_jni_lib dataset/src/test/resources/ libarrow_dataset_jni.dylib
```

### idea jdk 11 找不到 Unsafe

官网文档有说明，在 Preference 中，修改配置 Java Compiler，不使用 `--release`。

![idea配置](/assets/blog/arrow-build/disable-javac-release.jpg)

> For JDK 11, due to an IntelliJ bug, you must go into Settings > Build, Execution, Deployment > Compiler > Java Compiler and disable “Use ‘–release’ option for cross-compilation (Java 9 and later)”. Otherwise you will get an error like “package sun.misc does not exist”.

这个是一个 idea 的 [bug](https://youtrack.jetbrains.com/issue/IDEA-201168)。

### idea 找不到 ArrowType 等类

官网文档有说明，在 Project Structure 中，将 `vector/target/generated-sources` 目录添加到 sources 目录中。

这部分代码是通过 `drill-fmpp-maven-plugin` 生成的代码，idea 未自动识别到。

![idea配置](/assets/blog/arrow-build/generated-sources.jpg)

> In the Files tool window, find the path vector/target/generated-sources, right click the directory, and select Mark Directory as > Generated Sources Root. There is no need to mark other generated sources directories, as only the vector module generates sources.

### M1 动态库不 match 的问题

jdk 分为 x86_64 和 aarch64（M1），默认 jni 编译出来的是 aarch64（M1）的，需要使用的 jdk 也必须是 aarch64 的。否则会报动态库不 match 错误。

### DirectReservationListener 报错 reservedMemory 找不到

`TestReservationListener` 单测报错，找不到 field `reservedMemory`。

在一些 jdk 版本中，`java.nio.Bits` 的 `reservedMemory` 是 `RESERVED_MEMORY`，只需要修改即可。

我目前在 m1 的电脑上碰到了该问题，使用的 jdk 11 aarch64 非 oracle 的，是第三方的 zulu。

## 参考资料

1. [Building Arrow Java](https://arrow.apache.org/docs/developers/java/building.html)

## 拓展资料

1. Apache Arrow - High-Performance Columnar Data Framework: [b站](https://www.bilibili.com/video/BV14R4y1s7Ew/) [youtube](https://www.youtube.com/watch?v=YhF8YR0OEFk)