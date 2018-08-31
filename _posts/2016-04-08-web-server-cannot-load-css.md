---
layout: post
title: Web 开发环境无法加载 css 文件的问题小结
category: python
tags: ['python', 'web', 'flask']
---

笔者在实际开发过程中，碰到过一些开发环境配置的问题，汇总在此，希望可以帮助碰到类似问题的人，少走点弯路。

首先，先确认文件是否加载成功，在 chrome 调试工具查看即可；其次，要观察一下 Content Type 是否为 text/css，其他文件也类似，Content Type 出错的话，浏览器是不会渲染 CSS 的，导致加载失败。

# windows 注册表配置问题

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

# php-fpm 配置错误导致加载失败

在 php 环境搭建配置过程中，碰到类似的问题，加载的 css 文件的 Content Type 为 text/html。

基本环境是 nginx + php-fpm，nginx 的 location 匹配会使得 css 静态文件经过 php-fpm，经过了 php-fpm 之后文件的 Content Type 就从 text/css 变为了 text/html，导致浏览器渲染失败。

解决方法：需要排查 nginx 的 location 或者类似的配置，让静态文件不要走 php-fpm。php-fpm 开启 security.limit_extensions 的后缀限制，有助于类似问题的排查。