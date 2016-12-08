---
layout: post
title: Web 开发环境无dev法加载 css 文件
category: python
tags: ['python', 'web', 'flask']
---

在 windows 下搭建 flask 本地开发环境的时候，启动内置的调试服务器，碰到了一个非常诡异的问题：就是页面内的所有 css 和 js 文件都加载失败，然后调试工具查看，发现 css 文件的 Content-Type 为 application/x-css。

flask 的内置调试服务器是使用 Python 来编写的一个简单服务器，里面通过 mimetypes 来获取文件的后缀名：

```python
import mimetypes
mimetyps.guess_type('test.css')  # > ('text/css', None)
```

发现 .css 获取的 MIME type 不正常。

参考 [Resource interpreted as Stylesheet but transferred with MIME type application/x-css](http://www.cnblogs.com/lance2088/p/4173868.html) 这篇文章，修改 windows 的注册表后解决。

解决步骤：cmd 中运行 regedit 打开注册表，在 HKEY_CLASSES_ROOT 找到 .css 节点，修改Content Type 为 text/css。

再次打开测试页面，css 加载正常。
