---
layout: post
title: Maven 使用经验小结
category: java
tags: ['java', 'maven']
---

# 安装

Maven 是一个 Java 的工程管理工具，只依赖 Java JDK 1.5 版本以上即可，依赖环境变量 JAVA_HOME。Maven 的安装路径一般也会设置一个环境变量 M2_HOME，直接下载[官方编译好的 Binary Archive](http://maven.apache.org/download.cgi)，解压后配置即可。

```bash
# init java & maven environment variables
# 下面的脚本可以配置在 ~/.bashrc 或 ~/.bash_profile 等地方，也可以单独配置一个 sh 脚本，通过 source 来加载
export JAVA_HOME=/path/to/jdk
export PATH=${JAVA_HOME}/bin:${PATH}

export M2_HOME=/path/to/maven
export PATH=${M2_HOME}/bin:${PATH}

# maven 的环境变量参数
export MAVEN_OPTS="-Xms128m -Xmx512m -Dmaven.artifact.threads=8"
```

本文使用的环境为 Linux（CentOS 6.3），JDK 1.7.0_79，Maven 3.3.3。

参考官方文档[安装](http://maven.apache.org/install.html)和[配置](http://maven.apache.org/configure.html)。

至此，安装完成，运行测试。

```bash
$ mvn -version
Apache Maven 3.3.3 (7994120775791599e205a5524ec3e0dfe41d4a06; 2015-04-22T19:57:37+08:00)
Maven home: /path/to/apache-maven-3.3.3
Java version: 1.7.0_79, vendor: Oracle Corporation
Java home: /path/to/jdk1.7.0_79/jre
Default locale: en_US, platform encoding: ISO-8859-1
OS name: "linux", version: "2.6.32", arch: "amd64", family: "unix"
```

## 配置国内镜像

Maven 自带的源速度比较慢，下载依赖的时候非常漫长。国内目前比较好用的是阿里云的镜像。

配置方法：在 ~/.m2/setting.xml 或者 maven 目录下的 conf/setting.xml 都可以，将下面的 mirror 添加在 mirrors 下即可。

```xml
<mirror>
  <id>aliyun</id>
  <name>aliyun Central</name>
  <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
  <mirrorOf>central</mirrorOf>
</mirror>
```

之前有用过 oschina 的镜像，不过已经关闭了。

# 项目示例

以下是我个人碰到的一些使用场景，给出了完整的 maven 示例和简单的说明。

完整示例在[github](https://github.com/icejoywoo/icejoywoo.github.io/tree/master/assets/blog/maven-tips/)。

## pom.xml 基本结构

基本结构如下：

```xml
<project>
    <groupId>com.github.icejoywoo</groupId>
    <artifactId>simple-maven-project</artifactId>
    <modelVersion>4.0.0</modelVersion>

    <name>Simple Maven Project</name>
    <packaging>jar</packaging>
    <version>1.0</version>

    <properties>
        ...
    </properties>

    <dependencies>
        <dependency>
            ...
        </dependency>
    </dependencies>

    <build>
        <extensions>
            <extension>
                ...
            </extension>
        </extensions>

        <plugins>
            <plugin>
                ...
            </plugin>
        </plugins>
    </build>
</project>
```

上面的结构是比较常用的几个部分，下面简单介绍一下，详情请参考[POM 官方文档](https://maven.apache.org/pom.html)。

### properties

properties 提供了一个占位符的 property 语法，比如使用 property X，就可以用 ${X}，可以用在 dependency、plugin 等地方。包含 5 种不同的 property：

1. env.X 代表 shell 环境变量，例如 env.PATH。
2. project.X 代表 pom.xml 中相应的值，例如 ```<project><version>1.0</version></project>``` 可以用 ${project.version} 来访问。
3. settings.X 代表 settings.xml 中相应的值，这个是 maven 的配置文件，例如 ```<settings><offline>false</offline></settings>``` 可以通过 ${settings.offline} 来访问。
4. Java 系统自带的 properties。
5. 通过 \<properties\> 定义的。

示例定义：

```xml
<properties>
    <junit.version>4.11</junit.version>
    <maven-shade-plugin.version>2.3</maven-shade-plugin.version>
</properties>
```

可以在后续的 dependency 中使用 ${scala.version} 来获取这里的定义，相当于 pom 有了全局变量定义。

### dependencies

这里是项目依赖的类库，可以通过 [mvnrepository](https://mvnrepository.com/) 来搜索对应的包，然后添加进来。

```xml
<dependencies>
    <dependency>
        <groupId>junit</groupId>
        <artifactId>junit</artifactId>
        <version>${junit.version}</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

scope 稍微说明一下，scope 为 provided 的情况是表示容器或部署环境内提供了对应的包，编译的时候会带上，打包的时候不会带。主要和 maven-shade-plugin 插件配合使用。

### build.extensions

目前这块我只知道一个 extension，提供一些 property，比如 os.detected.name 等一些与系统相关的参数。

```xml
<extensions>
    <extension>
        <groupId>kr.motd.maven</groupId>
        <artifactId>os-maven-plugin</artifactId>
        <version>${os-maven-plugin.version}</version>
    </extension>
</extensions>
```

### build.plugins

插件可以是编译、打包等，丰富的插件可以帮助我们做很多事情。例如：编译 scala、将依赖一起打包等。

下面给出一个打包插件 maven-shade-plugin 的示例：

```xml
<plugins>
    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>${maven-shade-plugin.version}</version>
        <executions>
            <execution>
                <phase>package</phase>
                <goals>
                    <goal>shade</goal>
                </goals>
                <configuration>
                    <transformers>
                        <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                    </transformers>
                </configuration>
            </execution>
        </executions>
    </plugin>
</plugins>
```

## Scala 编译

Scala 是有一个 sbt 的编译工具，可惜速度太慢，所以想用 maven 来编译打包。

主要使用了 [scala-maven-plugin](http://davidb.github.io/scala-maven-plugin/)，并且使用 shade 来打包，将 scala-lang 一起打包。

scala 代码路径为 src/main/scala，与 java 代码平级目录。

额外需要注意一点：scala 的依赖需要注意 scala major version，兼容性问题，最好选用对应的版本的依赖。

```xml
<properties>
    <scala.major.version>2.11</scala.major.version>
    <scala.version>2.11.8</scala.version>

    <maven-shade-plugin.version>2.3</maven-shade-plugin.version>
    <scala-maven-plugin.version>3.2.1</scala-maven-plugin.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.scala-lang</groupId>
        <artifactId>scala-library</artifactId>
        <version>${scala.version}</version>
    </dependency>
</dependencies>

<plugins>
    <plugin>
        <groupId>net.alchim31.maven</groupId>
        <artifactId>scala-maven-plugin</artifactId>
        <version>${scala-maven-plugin.version}</version>
        <executions>
            <execution>
                <id>compile-scala</id>
                <phase>compile</phase>
                <goals>
                    <goal>add-source</goal>
                    <goal>compile</goal>
                </goals>
            </execution>
            <execution>
                <id>test-compile-scala</id>
                <phase>test-compile</phase>
                <goals>
                    <goal>add-source</goal>
                    <goal>testCompile</goal>
                </goals>
            </execution>
        </executions>
        <configuration>
            <scalaCompatVersion>${scala.major.version}</scalaCompatVersion>
            <checkMultipleScalaVersions>true</checkMultipleScalaVersions>
            <scalaVersion>${scala.version}</scalaVersion>
        </configuration>
    </plugin>
<plugins>
```

## Spark 编译

Apache Spark 的应用可以使用 scala 或 java 来编写，scala 相对简洁很多，如果需要 scala，只需要抄上面的配置即可。

需要注意 spark、hadoop、scala 等的版本，下面是 spark 编译的配置示例：

```xml
<properties>
    <scala.major.version>2.11</scala.major.version>
    <scala.version>2.11.8</scala.version>
    <spark.version>2.0.1</spark.version>
    <hadoop.version>2.6.0</hadoop.version>
</properties>

<dependencies>
    <dependency> <!-- Hadoop dependency -->
        <groupId>org.apache.hadoop</groupId>
        <artifactId>hadoop-common</artifactId>
        <version>${hadoop.version}</version>
        <scope>provided</scope>
    </dependency>

    <dependency>
        <groupId>org.apache.hadoop</groupId>
        <artifactId>hadoop-hdfs</artifactId>
        <version>${hadoop.version}</version>
        <scope>provided</scope>
    </dependency>

    <dependency>
        <groupId>org.apache.hadoop</groupId>
        <artifactId>hadoop-mapreduce-client-core</artifactId>
        <version>${hadoop.version}</version>
        <scope>provided</scope>
    </dependency>

    <dependency> <!-- Spark dependency -->
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-core_${scala.major.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>

    <dependency> <!-- Spark dependency -->
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-sql_${scala.major.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

编译完后的，将第三方依赖都打入 jar 包，然后通过 spark-submit 来运行即可。

## Protobuf 编译

完整示例使用了 protobuf 官方文档中的代码，这里主要是需要额外调用 protoc 产生代码，并且加入到 source directory 中，一起编译。这里主要采用 maven-antrun-plugin 来解决。

```xml
<properties>
    <protobuf.version>2.5.0</protobuf.version>

    <maven-antrun-plugin.version>1.8</maven-antrun-plugin.version>
    <build-helper-maven-plugin.version>1.12</build-helper-maven-plugin.version>
    <protobuf.output.directory>${project.build.directory}/generated-sources/protobuf/java</protobuf.output.directory>
</properties>

<dependencies>
    <dependency>
        <groupId>com.google.protobuf</groupId>
        <artifactId>protobuf-java</artifactId>
        <version>${protobuf.version}</version>
    </dependency>
</dependencies>

<plugins>
     <plugin>
         <groupId>org.apache.maven.plugins</groupId>
         <artifactId>maven-antrun-plugin</artifactId>
         <version>${maven-antrun-plugin.version}</version>
         <executions>
             <execution>
                 <id>compile-protobuf</id>
                 <phase>generate-sources</phase>
                 <configuration>
                     <target>
                         <mkdir dir="${protobuf.output.directory}"/>
                         <path id="protobuf.input.filepaths.path">
                             <fileset dir="${basedir}/src/main/proto/">
                                 <include name="*.proto"/>
                             </fileset>
                         </path>
                         <pathconvert pathsep=" " property="protobuf.input.filepaths" refid="protobuf.input.filepaths.path"/>
                         <exec failonerror="true"
                               executable="/usr/local/bin/protoc">
                             <arg value="--proto_path"/>
                             <arg value="${basedir}/src/main/proto"/>
                             <arg value="--java_out"/>
                             <arg value="${protobuf.output.directory}"/>
                             <arg line="${protobuf.input.filepaths}"/>
                         </exec>
                     </target>
                 </configuration>
                 <goals>
                     <goal>run</goal>
                 </goals>
             </execution>
         </executions>
     </plugin>

     <plugin>
         <groupId>org.codehaus.mojo</groupId>
         <artifactId>build-helper-maven-plugin</artifactId>
         <version>${build-helper-maven-plugin.version}</version>
         <executions>
             <execution>
                 <id>add-classes</id>
                 <phase>generate-sources</phase>
                 <goals>
                     <goal>add-source</goal>
                 </goals>
                 <configuration>
                     <sources>
                         <source>${protobuf.output.directory}</source>
                     </sources>
                 </configuration>
             </execution>
         </executions>
     </plugin>
 </plugins>
```

运行测试：

```bash
$ java -cp target/protobuf-demo-project-1.0.jar AddPerson address.pb
address.pb: File not found.  Creating a new file.
Enter person ID: 1
Enter name: John
Enter email address (blank for none): john@xxx.com
Enter a phone number (or leave blank to finish): 123456789
Is this a mobile, home, or work phone?
Unknown phone type.  Using default.
Enter a phone number (or leave blank to finish):

$ java -cp target/protobuf-demo-project-1.0.jar ListPeople address.pb
Person ID: 1
  Name: John
  E-mail address: john@xxx.com
  Home phone #: 123456789
```

# 其他用法

```bash
# 执行某个类
$ mvn exec:java -Dexec.mainClass="com.example.Main" -Dexec.args="arg0 arg1 arg2" -Dexec.classpathScope=runtime
```

# 总结

其实本文列举的几个例子，也是有其他的方法可以做到相同的效果，这里只给出我自己使用的一种方法，Maven 本身比较复杂和强大的，需要花费较多的时间和精力才能掌握。我个人目前只是略知皮毛，路漫漫，共勉！
