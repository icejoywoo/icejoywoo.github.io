---
layout: post
title: C++ std::string_view 学习笔记
category: c++
tags: ['c++', 'c++ weekly']
---

# 概述

string_view 是一个从 C++ 17 开始引入的新特性，是一个字符串的视图，轻量级的字符串，不可变的，不持有的内存，只持有内存的指针。支持的方法与 string 非常类似，合理使用 string_view 可以获得不错的性能提升，并且编译器也可以有更多优化的机会。

# 基本用法

string 是可变的（mutable），可以对其内容进行修改。

```cpp
std::string s = "Hello";
s[0] = 'h';  // 修改首字母
```

string_view 是不可变的，也不own内存。

```cpp
std::string_view sv = s;
```

我们可以打印这两个地址的内存，会发现其内存是一样的。

```cpp
print_address(s.data()); // hello: 140701877183585
print_address(sv.data()); // hello: 140701877183585
```

## 作为函数参数

string 可以作为参数的地方，string_view 也可以。

```cpp
size_t length(const std::string& s) {
  print_address(s.data());
  return s.size();
}

size_t length_view(const std::string_view& s) {
  print_address(s.data());
  return s.size();
}

```

`const char*` 的字符串也可以传入，使用方法上二者也是一致的。唯一的区别就是，string_view 不会拷贝一份数据。

```cpp
const char* input = "Hello, World!";
print_address(input); // Hello, World!: 4471902244
// string as function parameter
length(input); // Hello, World!: 140701877183561
// string_view as function parameter
length_view(input); // Hello, World!: 4471902244
```


# 查看汇编

对于 `const string&` 作为输入参数的函数来说，在传入一个 `const char*` 字符串的时候，会隐式创建一个 string 对象。汇编在下图右侧部分，可以从汇编上看出来有一次 basic_string 的调用。

![length string asm](/assets/blog/cpp-string-view/length_string.jpg)

对于 `const string_view&` 作为输入参数的函数来说，他只是获取了地址，而不需要构造任何对象，所以从汇编上看字符串的长度直接变成了一个计算好的数字。

![length string_view asm](/assets/blog/cpp-string-view/length_string_view.jpg)

并且可以通过在函数前面加上 `constexpr` 来进一步把函数调用也优化掉，但是对于 `string` 来说依然会有一个构造函数的开销。

![constexpr length string_view asm](/assets/blog/cpp-string-view/constexpr_length_string.jpg)

![constexpr length string_view asm](/assets/blog/cpp-string-view/constexpr_length_string_view.jpg)

汇编指令的减少，可以明显看出，合理地使用 `string_view` 会带来非常可观的性能收益。

说明：汇编的查看使用了[Compiler Explorer](https://godbolt.org/)网站。

# 简单的性能测试

下面简单的对 string 和 string_view 的 substr 函数进行简单的对比，使用的是 folly benchmark，完整代码参考附录。

```cpp
BENCHMARK(string_substr, n) {
  for (unsigned int i = 0; i < n; ++i) {
    std::string& result = inputs[i % INPUT_LENGTH];
    folly::doNotOptimizeAway(result.substr(10).length());
  }
}

BENCHMARK_RELATIVE(string_view_substr, n) {
  for (unsigned int i = 0; i < n; ++i) {
    std::string_view result = inputs[i % INPUT_LENGTH];
    folly::doNotOptimizeAway(result.substr(10).length());
  }
}
```

结果如下：
```
============================================================
cxx17/string_benchmark.cc      relative  time/iter   iters/s
============================================================
string_substr                             135.77ns     7.37M
string_view_substr               22594%   600.93ps     1.66G
```

可以明显看出来，string_view 因为没有内存拷贝，其速度是非常快的。

# 结语

C++ 17 提供的 string_view 本身是一个轻量级的字符串，在无需修改数据的情况下，可以非常简单有效地提升字符串处理的效率。

# 参考资料

1. [C++ Weekly - Ep 73 - std::string_view](https://www.youtube.com/watch?v=fj_CF8xK760)
2. [C++17 std::string_view - C++ Weekly EP2](https://www.bilibili.com/video/BV1iV411C769/)
3. [std::basic_string_view - cppreference](https://en.cppreference.com/w/cpp/string/basic_string_view)

# 附录

## print_address

```cpp
void print_address(const char* data) {
  std::cout << data << ": " << reinterpret_cast<uintptr_t>(data) << std::endl;
}
```

## substr benchmark

```cpp
#include "folly/Benchmark.h"

#include <string>
#include <string_view>
#include <random>

std::string generateRandomString(int length, unsigned seed) {
  std::random_device rd;
  std::mt19937 gen(seed == 0 ? rd() : seed);
  std::uniform_int_distribution<> dis('a', 'z');
  std::string result;
  for (int i = 0; i < length; i++) {
    result += dis(gen);
  }
  return result;
}

static std::vector<std::string> inputs;
constexpr int INPUT_LENGTH = 1024;

BENCHMARK(string_substr, n) {
  for (unsigned int i = 0; i < n; ++i) {
    std::string& result = inputs[i % INPUT_LENGTH];
    folly::doNotOptimizeAway(result.substr(10).length());
  }
}

BENCHMARK_RELATIVE(string_view_substr, n) {
  for (unsigned int i = 0; i < n; ++i) {
    std::string_view result = inputs[i % INPUT_LENGTH];
    folly::doNotOptimizeAway(result.substr(10).length());
  }
}

int main() {
  // init input strings
  for (int i = 0; i < INPUT_LENGTH; i++) {
    std::string input = generateRandomString(20 + (i / 10 * 10), i);
    inputs.emplace_back(input);
  }
  folly::runBenchmarks();
}

```
