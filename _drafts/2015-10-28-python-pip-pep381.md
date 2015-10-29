---
layout: post
title: 自行搭建PyPI私有repo
category: python
tags: ['python', 'PyPI', 'pep381']
---

在某些环境下，使用的机器是无法直接连接公网的
[Create a local PyPI mirror](https://aboutsimon.com/2012/02/24/create-a-local-pypi-mirror/)

1. [PEP 381](https://www.python.org/dev/peps/pep-0381/)

http://stackoverflow.com/questions/17667835/pep381clientpep381run-wont-download-packages-from-the-official-pypi-server


mkdir -p $HOME/.pip/
echo -e "[global]\nindex-url = http://xxx.com/pypi/simple" >> $HOME/.pip/pip.conf
echo -e "[install]\ntrusted-host = pip.baidu.com" >> $HOME/.pip/pip.conf
echo -e "[easy_install]\nindex-url = http://xxx.com/pypi/simple" >> $HOME/.pydistutils.cfg

bandersnatch报错
OSError: [Errno 31] Too many links
文件系统子目录的32k限制

Many sub-directories needed
The PyPI has a quite extensive list of packages that we need to maintain in a flat directory. Filesystems with small limits on the number of sub-directories per directory can run into a problem like this:

2013-07-09 16:11:33,331 ERROR: Error syncing package: zweb@802449
OSError: [Errno 31] Too many links: '../pypi/web/simple/zweb'
Specifically we recommend to avoid using ext3. Ext4 and newer does not have the limitation of 32k sub-directories.
