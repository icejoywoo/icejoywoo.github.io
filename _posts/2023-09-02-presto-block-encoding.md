---
layout: post
title: Presto Block 序列化格式
category: Presto
tags: ['大数据', 'Presto', '计算引擎']
---

# 概述

Facebook Presto 是一款高效通用计算引擎，用于大数据分析查询。其发展历史可以追溯到 Facebook 内部的大数据处理需求。它最初是为了解决广告、新闻feed和统计数据分析等场景的查询问题而开发的。随着社交网络和移动互联网的发展，Presto 逐渐成为 Facebook 内部数据处理的主要引擎之一。

当前，Presto 主要用于处理大规模的数据分析查询，如广告报表、用户行为分析、趋势研究等。它还被用于其他场景，如数据仓库、机器学习和实时数据处理等。

本文主要介绍 Presto 数据 Page 和 Block 的序列化格式。

说明：本文使用的 master 分支，commit 为 `7edd2c2366edf0867491ad1b6237066ac0fd3e4d`。

# 序列化

Presto 在内部数据处理的过程中使用了列存格式，Block 用于表示一列数据，Page 是由多个列的 Block 组成，表示一批数据。

Block 是实际底层存储类型，用于实现各种丰富的数据类型（Type）。换一句话说，就是 Block 是 physical，Type 是 logical，Type 是通过 Block 来存储的，Block 的数据如何解读是 Type 决定的，同一个 Block 可以实现多种不同的类型。

例如，ByteArrayBlock 可以实现 boolean 和 tinyint 两种 Type，tinyint 就是 int8_t，这个是数据库中的类型。

下面我们介绍序列化的格式，就分为下面两类，总共四个部分：
* Page
* Block
	* Primitive Block：基本类型，整数、boolean 等
	* Complex Block：复杂类型，Array、Map等
	* Other Block: 其他类型，RLE等

## Page

Presto 支持多个 Page 序列化，Page 有 header meta 信息用于标记长度等信息，用于反序列化的时候识别单个 Page 的长度。在序列化多个 Page 的时候，并没有记录 Page 的个数，需要逐个 Page 反序列化返回，直到读完所有数据。

Page 的序列化格式分为两个部分：Header 和 Block Data，下面分别介绍其格式。

Header:

| positionCount | codec marker | UncompressedSize | Size | checksum |
| --- | --- | --- | --- | --- |
| int | byte | int | int | long |

Block Data:

| block count | BLOCK 0 | BLOCK 1 | ... |
| --- | --- | --- | --- |
| int | Block | Block | ... |


说明：
* Page 支持对 block data 的部分进行压缩，支持多种算法：lz4、snappy、gzip、zstd，0.165 版本中只支持 lz4，代码 `PageFileWriterFactory`
* Header 中有 UncompressedSize 表示未压缩前的大小，这个主要是用于解压的时候使用，lz4 算法是需要知道未压缩大小的
* 0.165 版本中没有 checksum 字段
* codec marker 是一个标记 byte，用 bit 的 0 和 1 来标记某个信息是否存在，用于标记三个信息：是否压缩、是否加密、是否有 checksum，代码 `PageCodecMarker`
* Page 的 header 信息参考代码 `PagesSerdeUtils.writeSerializedPageMetadata`


### LengthPrefixedString

这个是一种序列化字符串的格式，length + bytes 的格式，length 用来记录字符串的长度，用 int 表示。bytes 就是 length 长度的字符串 byte 数据。


| length prefixed string |
| --- | --- |
| length(int) | bytes |

在 Presto 的序列化中，LengthPrefixedString 用于保存 block encoding name，用于标记 Block 对应的类型，来选去对应的方式反序列化。

## Primitive Block

### Byte/Short/Int/Long

| block encoding name | positionCount | null bits | data |
| --- | --- | --- | --- |
| LengthPrefixedString | int | byte[] | data |

这四种类型的格式是完全一致的，唯一的区别是 block encoding name 和 data 的类型：
* Byte：block encoding name = BYTE_ARRAY, data = byte[]
* Short：block encoding name = SHORT_ARRAY, data = short[]
* Int：block encoding name = INT_ARRAY, data = int[]
* Long：block encoding name = LONG_ARRAY, data = long[]

说明：
* Presto 中的 position 表示的是某一行的索引值，positionCount 表示的总行数
* null bits 在序列化的时候使用了 bit 来表示，为 1 的时候表示该行值为 null，在 Block 中使用 boolean 来表示的，所以这里涉及到了boolean 转换为 null bits 的过程

### Int128

| block encoding name | positionCount | null bits | data |
| --- | --- | --- | --- |
| LengthPrefixedString | int | byte[] | long long[] |

说明：
* block encoding name = INT128_ARRAY
* int128 是用两个 long 来表示的，在 0.165 版本的时候使用 FixedWidthBlock 来表示
* int128 是用来表示 LongDecimal 类型

### VariableWidthBlock

| block encoding name | positionCount | offsets | null bits | totalLength | data |
| --- | --- | --- | --- | --- | --- |
| LengthPrefixedString | int | int[] | byte[] | int | byte[] |

说明：
* block encoding name = VARIABLE_WIDTH
* 用于存储字符串（VARCHAR）等类型，每个元素的长度是不确定的，变长类型，这是与上面的 Block 的最大区别
* 最后的 data 是 byte 数据，还需要知道其长度，方便反序列化的时候知道读取多少字节，data 之前记录了 totalLength
* offsets 的大小是 positionCount + 1，其间隔用于计算每个元素的长度

## Complex Block

### Array

| block encoding name | values block | positionCount | offsets | null bits |
| --- | --- | --- | --- | --- |
| LengthPrefixedString | BLOCK | int | int[] | byte[] |

说明：
* block encoding name = ARRAY
* offsets 的个数是 positionCount + 1，第一个值为 0，offsets 相邻的两个值用于计算 size

### Map

| block encoding name | key block | value block | hash table length | hash table bytes | positionCount | offsets | null bits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LengthPrefixedString | Block | Block | int | byte[] | int | int[] | byte[] |

说明：
* block encoding name = MAP
* hash table length 为 -1 的时候，就代表没有 hash tables，后面的 hash table bytes 就没有
* hash tables 为了给 Map 提供 O(1) 的访问效率

### Row

| block encoding name | block count | block 0 | block 1 | ... | positionCount | offsets | null bits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LengthPrefixedString | int | Block | Block | ... | int | int[] | byte[] |

说明：
* block encoding name = ROW
* 在逻辑上 Row 和 Page 其实有点类似，Presto 中用 Row 来实现 Struct 类型。

### SingleMapBlock

这个表示一个 MapBlock 中的单行元素，包含一个 key 和 value。

| block encoding name | key block | value block | hash table length | hash table bytes |
| --- | --- | --- | --- | --- |
| LengthPrefixedString | Block | Block | int | byte[] |

说明：
* block encoding name = MAP_ELEMENT
* 因为就只有一个值，所以 offsets 和 null 的信息都没有，null 的信息在 key 和 value 的 block 中记录
* 和 Map 一样，hash tables 数据也是不一定有的

### SingleRowBlock

这个是读取一条 RowBlock 记录的，就是一行数据

| block encoding name | block count | block 0 | block 1 | ... |
| --- | --- | --- | --- | --- |
| LengthPrefixedString | int | Block | Block | ... |

说明：
* block encoding name = ROW_ELEMENT
* 因为就只有一个值，所以 offsets 和 null 的信息都没有，null 的信息在 key 和 value 的 block 中记录
* 和 Map 一样，hash tables 数据也是不一定有的

## Other Block

### RunLengthBlock

RLE 编码，只是单个值，然后记录单个值出现的次数。

| block encoding name | positionCount | single value block |
| --- | --- | --- |
| LengthPrefixedString | int | Block |

说明：
* block encoding name = RLE
* single value block，只有一个值，RLE 中的 position count 表示这个值重复了多少次

### DictionaryBlock

| block encoding name | positionCount | dictionary block | ids | MostSignificantBits | LeastSignificantBits | SequenceId |
| --- | --- | --- | --- | --- | --- | --- |
| LengthPrefixedString | int | Block | byte[] | long | long | long |

说明：
* block encoding name = DICTIONARY
* instance id 有最后三个数组成：MostSignificantBits、LeastSignificantBits、SequenceId

### LazyBlock

不支持序列化，内部的 Block 可以是上述的 Block。通过 LazyBlockLoader 来进行加载，一般是 HDFS 等远端的数据，这个主要是源头的数据，TableScan 读取上来的数据，在真正需要的时候再去加载。

# 额外说明

## InterleavedBlock

以前版本的 Map 是通过 `ArrayBlock<InterleavedBlock>` 来实现的，也没有 hash tables。ArrayBlock 的结构是一样的，只是 values block 换成了 InterleavedBlock。所以这里特殊对 InterleavedBlock 进行说明，新版本已经把这个删掉了。

InterleavedBlock 是一个可以包含多种不同类型 block 的 block，在写入数据的时候，会逐个 block 的写入。对于 Map 来说，就是 key 和 value 两个 block 轮流写入数据。InterleavedBlock 目前已知也就只用在 MapBlock 这一个地方。

| block encoding name | block count | block 1 name | block 2 name | ... |
| --- | --- | --- | --- | --- |
| LengthPrefixedString | int | LengthPrefixedString | LengthPrefixedString |  |

说明：
* block encoding name = INTERLEAVED
* Array offsets 全部都是翻倍的：InterleavedBlock 的 positionCount 是会每个 block 都算进去，Map 有两个 block，所以 positionCount 就是 * 2 的，所以会导致在 Array 中的 offsets 也都是 * 2 的。对于新的 MapBlock 实现来说，这是一个比较大的差异点。

# 总结

至此，我们已经详细介绍了 Presto Block 的序列化格式。这是一种面向列设计的 Columnar 格式，从序列化这个入口切入，可以帮助我们更好地理解数据类型和存储方式。Presto Block 的序列化过程包括将数据块中的数据和元数据打包成字节流，以便于在网络中传输或者存储。这种序列化格式在数据传输、数据存储和数据共享等场景中得到了广泛应用。通过对 Presto Block 的深入了解，我们可以更好地理解 Presto 计算引擎的工作原理，以及它在处理大规模数据查询方面的优势。

# 参考资料

1. [Simplify Block serialization/deserialization](https://github.com/prestodb/presto/commit/90a52a82829d674df8d96cd6157f05848a82b967)
2. [Add MapBlock with built-in hash table to enable O(1) map access](https://github.com/prestodb/presto/commit/d6a7bdedcbe78b4bc1f75a8ef4aa8db91c088df4)
3. [Block 序列化](https://www.yuque.com/icejoywoo/ybuud9/gk2aaks7kls0ehb0)