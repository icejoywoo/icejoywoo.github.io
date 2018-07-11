---
layout: post
title: Python 日志配置总结
category: Python
tags: ['python', 'logging']
---

大概提纲
1. logging 基本配置，写文件，并且带上 wf 日志
2. 多进程写日志的配置方法，使用 WatchedFileHandler，通过mv日志来进行每日切割，RotatingFileHandler 多进程存在问题