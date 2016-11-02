---
layout: post
title: Flask 无法加载 css 文件
category: python
tags: ['python', 'web', 'flask']
---

在搭建 flask 本地开发环境的时候，启动内置的调试服务器，碰到了一个非常诡异的问题：就是页面内的所有 css 和 js 文件都加载失败，然后调试工具查看，发现 css 文件的 Content-Type 为 application/x-css。

flask 的内置调试服务器是使用 Python 来编写的一个简单服务器，里面通过 mimetypes 来获取文件的后缀名

```python
import mimetypes
mimetyps.guess_type('test.css')  # > ('text/css', None)
```

http://www.cnblogs.com/lance2088/p/4173868.html
http://stackoverflow.com/questions/22839278/python-built-in-server-not-loading-css
