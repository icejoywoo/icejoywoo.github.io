---
layout: post
title: MongoDB Shard Cluster 数据平衡问题
category: python
tags: ['Python', 'CPython']
---

# 简介

MongoDB Shard Cluster 是 MongoDB 的集群解决方案，将数据进行了拆分，分布在多个 shard 节点上。

Shard key 是决定数据分布的关键配置，一旦创建后是无法修改的，修改方式只能重新建表并灌库，所以选择 shard key 需要提前规划好。

Shard key 分为两种：默认是 Range Shard Key，这种是根据 key 的范围进行分裂的，整个范围是最小值（MinKey）到最大值（MaxKey），通过数据填充后，超过 chunk size 之后不断地分裂成多个 chunk，并且通过 balancer 来不断地进行 chunk 迁移完成 rebalance 的操作，使得每个 shard 包含的 chunk 数目保持平衡。

本文主要介绍两种对 chunk 的操作，官方文档有这部分的说明，本文是两种操作的实践后的小结，供大家参考。

水平有限，如有错漏，敬请指教。

# Pre-splitting

[官方文档](https://docs.mongodb.org/manual/tutorial/create-chunks-in-sharded-cluster/)中对此有这样的一个描述：

> Pre-splitting the chunk ranges in an empty sharded collection allows clients to insert data into an already partitioned collection.

就是说 pre-splitting 预先创建一些 chunk 分布在空的 sharded collection，允许客户端插入数据到各个 chunk，空的 chunk 可以非常快速地进行 move 操作，从而可以分担读写压力到各个 shard，提升整个集群的吞吐量。

一般来说，理想情况下 MongoDB 自动进行 chunk 的创建和迁移，无需用户介入，但是现实中必须需要介入。

默认的 Range Shard Key 很难处理单调递增的 key，比如默认的 \_id 实现 ObjectId 就是单调递增的，使用 \_id 为 shard key，很容易使得新写入的数据都大部分集中在一个 Shard 上，导致写入存在热点，从而导致写入性能降低。

关于为什么单调递增的 Key 新写入的数据会大部分集中在一个 Shard 上。这里假设 shard 中的 chunk range 分布是：{MinKey, \_id0}；{\_id0, \_id1}；...；{\_idn-1, MaxKey}，因为单调递增，所以会落在最后一个 chunk 里，达到一定的 chunk size 后分裂，分裂完后不会立即进行 chunk 的迁移，会继续接受写入，导致这个 chunk 所在的 shard 接受了大量的写入，影响了整个系统的写入，无法将写入压力分摊到其他 shard 上。

通过预先创建一定数量的空 chunk，并且分布均匀后，写入压力可以分摊到多个 shard 上，提升系统的读写性能，从而提升了系统的吞吐量。

关于这个操作，官方提供了一个示例代码，主要是依赖 split 命令来实现，split 是指 chunk 分裂的位置，需要指定 middle，即分裂的位置。

```javascript
for ( var x=97; x<97+26; x++ ){
  for( var y=97; y<97+26; y+=6 ) {
    var prefix = String.fromCharCode(x) + String.fromCharCode(y);
    db.runCommand( { split : "myapp.users" , middle : { email : prefix } } );
  }
}
```

个人实践中，主要是进行日志数据的批量导入和查询，就是一次性导入大量数据，并且进行比较多的查询操作，一次批量写入，多次批量查询。因为业务特点，shard key 的选择是 date + uid，完全单调递增的。批量写入的数据都属于特定的一个时间，并且每个日期只需要导入一次数据，所以可以在数据导入前进行 pre-spitting 操作。另外，需要注意的是，split chunk 后最后自己去进行新分裂的空 chunk 的平衡，balancer 不一定可以完成你预期的平衡。

下面给出一个 Python 的示例代码

```python
import pymongo

mongo = pymongo.MongoClient("localhost:27030")

ns = 'db_name.collection_name'

uid_keys = '0123456789ABCDEF'

# 获取所有 shard 的信息
shards = list([i['_id'] for i in mongo.config.shards.find()])

index = 0
for i in uid_keys:
    for j in uid_keys:
        middle_key = {'_id': {'date': '2016-01-21', 'uid': i + j}}
        mongo.admin.command('split', ns, middle=middle_key)
        # 通过 moveChunk 来自行对新的 chunk 进行均衡分布
        mongo.amdin.command('moveChunk', ns, find=middle_key, to=shards[index % len(shards)])
        index += 1
```

# Merge Empty Chunks

Empty chunks 主要产生的原因：批量删除数据导致了 chunk 数据都被删除；索引中带有 expireAfterSeconds，即设置了过期时间，数据会在过期后被删除，导致部分 chunk 为空；通过 split 创建一些 empty chunk，但是没有插入数据。

Empty chunks 主要会导致的问题就是数据无法均衡，MongoDB 自带的 balancer 是根据 chunk 的数目来进行均衡的，chunk 的大小由 chunk size 来进行限制。而我们需要的数据均衡是各个 shard 尽可能存有差不多大小的数据，empty chunk 是占了位置但是存储数据为 0，势必会导致数据不均衡，当 empty chunk 数量非常多的时候，会导致数据无法均衡，这个时候需要人工介入，清理 empty chunk。

清理 empty chunk 的方法是通过 mergeChunk 的操作来将 empty chunk 与其他 chunk 合并来完成。

首先，是需要了解你的 sharded collection 的 empty chunk 的占比和数量。empty chunk 的判断主要是通过 dataSize 命令，注意需要在对应的 db 中运行，运行速度取决于 chunk 中数据的大小，详细参考[官方文档](https://docs.mongodb.org/manual/tutorial/merge-chunks-in-sharded-cluster/#verify-a-chunk-is-empty)。

```javascript
// use admin db to run
// example: mongo localhost:27017/admin empty_chunks.js

var _db = '<db>';
var ns = '<db>.<collection>';

var key_pattern = {_id: 1};

var total = 0;
var count = 0;

db.getSiblingDB('config').chunks.find({ns: ns}).forEach(function(item) {
    var info = db.getSiblingDB(_db).runCommand({dataSize: ns, keyPattern: key_pattern, min: item['min'], max: item['max']});
    ++total;
    if (info.numObjects == 0) {
        ++count;
        print('empty chunk: {min: ' + tojson(item['min']) + ', max: ' + tojson(item['max']) + '}')
    } else {
        print('non-empty chunk: {min: ' + tojson(item['min']) + ', max: ' + tojson(item['max']) + '}')
    }
    print(count + '/' + total);
});

print(count + '/' + total);
```

如果 colleciton 中存在大量的 empty chunk，需要尽可能地删除 empty chunk。主要是通过 mergeChunk 来进行操作，可以合并相邻的 empty chunk，来减少 empty chunk 的数量，mergeChunk 需要两个 chunk 在同一个 shard。如果不在同一个 shard，就需要通过 moveChunk 来将二者放在同一个 shard。

笔者的个人实践中，empty chunk 主要是因为数据过期删除之后导致的，数据不平衡非常严重，数据大部分落在了一个 shard 上，shard 的 chunk 数目基本一致，需要删除 empty chunk。下面是一个示例代码，用来合并 empty chunk。

```python
#!/usr/bin/env python

import datetime
import pymongo
import time
import traceback

mongo = pymongo.MongoClient('localhost:27030')

db_name = '<db_name>'
coll_name = '<coll_name>'
ns = '%(db_name)s.%(coll_name)s' % locals()

admin = mongo.admin
db = mongo[db_name]

# 数据过期时间，假设为 65 天
expired_date = datetime.datetime.combine(datetime.date.today(), datetime.time()) - datetime.timedelta(days=65)

config = mongo.config

shards = list(config.shards.find())

chunks = list(config.chunks.find({'ns': ns})

print len(chunks)

# helper functions
def retry_wrapper(f):
    def wrapper(*args, **kwargs):
        for _ in range(10):
            try:
                print f.func_name, args, kwargs
                ret = f(*args, **kwargs)
                print f.func_name, ret
                return
            except:
                print '>>> failed:', traceback.format_exc()
                time.sleep(1)
        raise Exception('retry max times')
    return wrapper

@retry_wrapper
def move_chunk(bounds, to):
    return admin.command('moveChunk', ns, bounds=bounds, to=shard)

@retry_wrapper
def merge_chunks(bounds):
    return admin.command('mergeChunks', ns, bounds=bounds)

merge_chunk = None

for chunk in chunks:
    info = db.command('dataSize', ns, keyPattern={u'_id': 1}, min=chunk['min'], max=chunk['max'])
    # merge empty chunk
    if info['numObjects'] == 0:
        print "empty chunk:", chunk
        if merge_chunk:
            # check same shard
            shard = merge_chunk['shard']
            if shard != chunk['shard']:
                move_chunk(bounds=[chunk['min'], chunk['max']], to=shard)
            merge_chunks(bounds=[merge_chunk['min'], chunk['max']])
            merge_chunk['max'] = chunk['max']
        else:
            merge_chunk = chunk
    else:
        print "non-empty chunk:", chunk
        # merge empty chunk to non-empty chunk
        if merge_chunk:
            shard = chunk['shard']
            # move empty chunk to non-empty chunk's shard
            if shard != merge_chunk['shard']:
                move_chunk(bounds=[merge_chunk['min'], merge_chunk['max']], to=shard)
            # merge
            merge_chunks(bounds=[merge_chunk['min'], chunk['max']])
            merge_chunk = None
```

# 参考资料

1. [Create Chunks in a Sharded Cluster](https://docs.mongodb.org/manual/tutorial/create-chunks-in-sharded-cluster/)
2. [Merge Chunks in a Sharded Cluster](https://docs.mongodb.org/manual/tutorial/merge-chunks-in-sharded-cluster/)
3. [Manage Sharded Cluster Balancer](https://docs.mongodb.org/manual/tutorial/manage-sharded-cluster-balancer/)
