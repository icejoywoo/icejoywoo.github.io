---
layout: post
title: C++ Glog 使用总结
category: c++
tags: ['c++', 'glog']
---


Glog 是 Google 的的一个 C++ 轻量日志库，源自于 Google，支持常用的日志功能：日志级别，VLOG，条件输出，DEBUG 日志等，同时支持 Gflags 的参数配置方式。

本文主要介绍下修改日志级别的参数，说明：glog 中使用了 gflags 的参数配置方法。

# 使用方法

对于可以动态修改的参数，我们可以通过为 C++ 程序添加一些接口来进行动态修改，例如通过信号量、Http请求等方式来动态修改，这样有助于我们动态控制打印日志的数量，有助于我们调试和定位问题。

## 日志级别

日志级别有4种：`INFO`、`WARNING`、`ERROR`、`FATAL`，在 `glog/log_severity.h`中定义，数值越大级别越高(severity)。`FATAL` 日志会终止程序，产生一个 core。

```cpp
const int GLOG_INFO = 0, GLOG_WARNING = 1, GLOG_ERROR = 2, GLOG_FATAL = 3, NUM_SEVERITIES = 4;
const int INFO = GLOG_INFO, WARNING = GLOG_WARNING, ERROR = GLOG_ERROR, FATAL = GLOG_FATA;
```

日志级别的使用方法很简单，只需要配置 `LOG` 一起使用即可。

```cpp
LOG(INFO) << "This is a INFO log";
LOG(WARNING) << "This is a WARNING log";
```

日志级别通过 `minloglevel` 来进行配置，对应在 gflags 中的全局变量就是 `GFLAGS_minloglevel`，这个可以动态进行调整。

## VLOG

`VLOG` 是 glog 中一个比较有特色的功能，这个本质上是 `INFO` 级别的日志，其级别可以是任意的数字。可以通过 `v` 进行全局调整，也可以通过 `vmodule` 针对模块进行调整。只要 `v` 配置的数字比 `VLOG` 中的大，并且 `INFO` 日志开启，那么日志就会被打印，否则默认 `VLOG` 日志不会打印。

```cpp
VLOG(1) << "This is a VLOG log";
```

这个时候，通过命令行参数 `--v` 或者全局变量 `GFLAGS_v` 来修改为 1，那么这条日志就可以被打印出来，该参数也是支持动态修改。

另外一个 `vmodule` 参数提供了更好的灵活性，可以根据模块进行开启。这里的 `module` 含义是不包含路径和扩展名的文件名，例如 `/path/to/Foo.cpp` 的模块就是 `Foo`。另外，这个地方还支持通配符`*`，例如 `F*` 就可以适配以 `F` 开头的所有模块。

`vmodule` 的格式为 `module1=level1,module2=level2`，可以配置多个模块，该参数也是可以通过 `GFLAGS_vmodule` 来动态修改的。下面举例说明。


假设，我们有两个文件，分别叫`foo.cpp`和`bar.cpp`，都有一个`init`方法。

```cpp
// filename: /path/to/foo.cpp
void initFoo() {
	VLOG(1) << "Init foo";
}

// filename: /path/to/bar.cpp
void initBar() {
	VLOG(1) << "Init bar";
}
```

通过配置`vmodule`设置为`foo=1`，就可以只打印`foo.cpp`中的`VLOG`日志。通过配置`vmodule`设置为`foo=1,bar=1`，就可以打印两个文件的日志。通过这种方式我们可以更细粒度地控制日志的打印。

## DLOG

glog 还支持 [Debugging log](https://google.github.io/glog/stable/logging/#debugging-support) 等，目前这类日志在实际代码中不多见，使用方法和普通LOG类似，只是在 DEBUG 模式下开启。

## 其他

需要注意的是，因为其中大部分日志级别都是可以动态修改的，那么就意味着内部都是通过条件进行判断的，而不是直接移除了某些日志，所以日志中的表达式等都是会被执行的。需要额外注意下日志打印的效率，是否有特别耗时的表达式等，日志打印也是需要进行优化的。

# 总结

glog 是一个常用的日志库，广泛在各类开源 C++ 项目中使用，其支持动态修改大部分配置，支持动态调整日志级别，这些都为我们调试提供了极大的便利。


# 参考资料

1. [Verbose logging](https://google.github.io/glog/stable/logging/#verbose-logging)
2. [glog简介](https://izualzhy.cn/glog)