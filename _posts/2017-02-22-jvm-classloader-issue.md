---
layout: post
title: JVM URLClassLoader 重新加载类的问题
category: java
tags: ['java', 'classloader']
---

# 问题描述

在维护旧系统时，碰到了一段使用 URLClassLoader 加载 url 的 jar，然后执行某个类的静态方法。远端更新了对应 url 的 jar，发现执行结果不符合预期，排查了很久未发现问题。最后，猜测是 URLClassLoader 并未重新加载 url 上的 jar，导致执行的还是旧的逻辑。

下面就用代码，来验证一下这个问题是否存在。

# 代码实验

测试用来加载的 jar 包，就是 return 不同的字符串，打包为两个 jar 包，hello1 和 hello2。

```java
public class Hello {
    public String say(String name) {
        // return "Hi, " + name; // version 1, hello1.jar
        return "Hello, " + name; // version 2, hello2.jar
    }
}
```

## 相同 URL 替换不同的 jar

URLClassLoader 的测试代码，测试加载同一个 URL，然后在更新 jar 后，再次加载 jar 调用 say 方法。代码会在加载执行完一次后，等待输入，输入完之后才会进行下一次加载执行。

```java
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Scanner;

public class URLClassLoaderDemo {
    public static void main(String[] args) throws IOException, ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        String url = "http://localhost/hello.jar";

        while (true) {
            URLClassLoader loader = new URLClassLoader(new URL[] { new URL(url)});
            Class cls = loader.loadClass("Hello");
            Method method = cls.getMethod("say", String.class);
            Object result = method.invoke(null, "Eric");
            System.out.println("Result: " + (String) result);

            Scanner in = new Scanner(System.in);
            System.out.println("Enter to continue.");
            in.next();
        }
    }
}
```

记载的 jar 第一次是 Hello 版本，第二次会在更新为 Hi 版本之后再执行。
hello.jar 第一次是 hello1.jar，第二次更新为 hello2.jar。
预期输出结果如下

```
Result: Hi, Eric
Enter to continue.

Result: Hello, Eric
Enter to continue.
```

实际上两次输出是一样的，没有变化。

## 不同的 URL 不同的 jar

代码变化为接收用户输入一个新的 url，其他没变。

```java
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Scanner;

public class URLClassLoaderDemo {
    public static void main(String[] args) throws IOException, ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        String url = "http://localhost/hello.jar";

        while (true) {
            URLClassLoader loader = new URLClassLoader(new URL[] { new URL(url)});
            Class cls = loader.loadClass("Hello");
            Method method = cls.getMethod("say", String.class);
            Object result = method.invoke(null, "Eric");
            System.out.println("Result: " + (String) result);

            Scanner in = new Scanner(System.in);
            System.out.println("Enter a new jar url: ");
            url = in.next();
        }
    }
}
```

输出如下：

```
Result: Hello, Eric
Enter a new jar url: http://localhost/hello1.jar

Result: Hi, Eric
Enter a new jar url: http://localhost/hello2.jar

Result: Hello, Eric
Enter a new jar url:
```

# 问题分析及解决

可以看到不同的 URL 是可以加载不同的 jar，不会有问题，但是相同的 URL 更新了 jar 是没有作用的。

通过查看 API，发现 URLClassLoader 在 1.7 之后有一个 close 方法，可以关闭 ClassLoader，并且卸载掉所加载的 jar 等资源。

```java
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Scanner;

public class URLClassLoaderDemo {
    public static void main(String[] args) throws IOException, ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        String url = "http://localhost/hello.jar";

        while (true) {
            URLClassLoader loader = new URLClassLoader(new URL[] { new URL(url)});
            Class cls = loader.loadClass("Hello");
            Method method = cls.getMethod("say", String.class);
            Object result = method.invoke(null, "Eric");
            System.out.println("Result: " + (String) result);
            loader.close();

            Scanner in = new Scanner(System.in);
            System.out.println("Enter to continue.");
            in.next();
        }
    }
}
```

可以看到预期的输出结果了。

```
Result: Hi, Eric
Enter to continue.

Result: Hello, Eric
Enter to continue.
```

# 总结

目前对其内部的原因还未搞明白，调试中发现相同 URL 加载的 JarFile 是同一个对象，应该是缓存了第一次打开的内容，外部更新后是不会被更新的。

使用 1.7 之后的 JDK，可以直接使用 close，来实现一个 jar 资源的更新加载，还是非常方便的。在之前的版本需要实现类似的需求，可能需要自定义 ClassLoader。

# 参考资料

1. [URLClassLoader会“挂住”所有它已经打开了的在classpath上的文件](http://rednaxelafx.iteye.com/blog/628394)
2. [Cache which java classes are in a jar when opening jar the first time during classloading](http://mail.openjdk.java.net/pipermail/core-libs-dev/2015-September/035016.html)
