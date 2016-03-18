---
layout: post
title: 工程中使用的哈希函数汇总
category: hash function
tags: ['hash function', 'Murmurhash']
---


# 简介

本文主要是想

传统的 hash 算法
MD5，SHA1，SHA256

相对较新的算法
Murmurhash：https://sites.google.com/site/murmurhash/

cityhash：https://github.com/google/cityhash

SpookyHash：http://burtleburtle.net/bob/hash/spooky.html

Karp-Rabin algorithm 字符串匹配算法，需要一个哈希函数，可以方便地 rehash

linux 的 hash 函数
```
unsigned long hash_long(unsigned long val, unsigned int bits)
{
    unsigned long hash = val * 0x9e370001UL;
    return hash >> (32 - bits);
}
```

# 参考资料

1. [General Purpose Hash Function Algorithms](http://www.partow.net/programming/hashfunctions/index.html)
2. [（翻译）Hash 函数概览](http://www.oschina.net/translate/state-of-hash-functions) [（原文）State of the hash functions, 2012](http://blog.reverberate.org/2012/01/state-of-hash-functions-2012.html)
3. [常用哈希（散列）函数集合 - NHF（Normal Hash Function）](http://my.oschina.net/sulliy/blog/78248)
