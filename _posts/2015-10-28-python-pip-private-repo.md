---
layout: post
title: 自己动手搭建PyPI私有repo
category: python
tags: ['python', 'PyPI', 'pep381']
---

Python 有个非常好用的包管理工具——pip，在国内的网络环境下，使用[官方的 pypi](https://pypi.python.org/simple/)速度有点慢，而且不稳定，可以考虑使用[豆瓣的 pypi](http://pypi.douban.com/simple/)，这是在可以连接外网的情况下我们可以选择比较容易的使用 pip。

在工作或其他环境中，因为安全等各种原因导致机器是无法直接连接外网的，这样就无法使用 pip 的公网的 pypi repo。这种情况下我们需要自己动手来打造供内部使用的 pypi repo。

经过在 Google 进行搜索之后发现了 [PEP 381](https://www.python.org/dev/peps/pep-0381/) 和 [Create a local PyPI mirror](https://aboutsimon.com/2012/02/24/create-a-local-pypi-mirror/)，尝试运行后得到的结果是空的，pep381client已经很久未更新了，pypi 现在已经从 http 换成了 https，在 google 中查到一个[stackoverflow上的回答](http://stackoverflow.com/questions/17667835/pep381clientpep381run-wont-download-packages-from-the-official-pypi-server)，发现了 bandersnatch，最新版是 1.8，上传日期为 2015.03.16。

# 搭建私有 pypi

我使用的环境是 Python 2.7.3，搭建pypi的机器是需要有公网权限的，用来更新 pypi，然后其他机器可以通过这个机器上的 pypi 来进行更新。

首先是安装 bandersnatch，这部分在[官方文档](https://pypi.python.org/pypi/bandersnatch#installation)有详细步骤。

```bash
# 创建工作目录
$ mkdir pypi
$ cd pypi

# 安装 bandersnatch
$ virtualenv bandersnatch
$ source bandersnatch/bin/activate
$ pip install -r https://bitbucket.org/pypa/bandersnatch/raw/stable/requirements.txt

# 拷贝 bandersnatch 自带的默认配置
$ cp bandersnatch/lib/python2.7/site-packages/bandersnatch/default.conf .

# 根据需求自行修改，默认配置内有注释解释各个选项的含义，配置项并不多
$ cat default.conf
[mirror]
; pypi文件下载的目录
directory = /path/to/pypi/data

master = https://pypi.python.org

timeout = 10

workers = 3

stop-on-error = false

delete-packages = true

[statistics]
; access log 的目录，这里配置的是 nginx
access-log-pattern = /var/log/nginx/*.pypi.python.org*access*

# 同步官方的 pypi，因为需要同步的数据量非常大，所以建议 nohup 运行
$ nohup bandersnatch -c ./default.conf mirror > ./bandersnatch.log 2>&1 &
```

例行的更新可以通过 crontab 进行配置，在配置的 directory 下有一个 web 目录，需要通过 web server 来进行访问，这里提供一个 nginx 的参考配置

```
server {
    listen 80;
    server_name pypi.domain.local;
    access_log /var/log/nginx/pypi.domain.local.access.log;

    location / {
        root /path/to/pypi/data/web;
        autoindex on;

        allow all;
    }
}
```

# 配置pip的repo

Linux 的配置如下（Windows 下的配置文件在用户目录的 pip 目录下），配置采用了 shell 命令的形式：

```bash
mkdir -p $HOME/.pip/
echo -e "[global]\nindex-url = http://pypi.xxx.com/simple" >> $HOME/.pip/pip.conf
echo -e "[install]\ntrusted-host = pypi.xxx.com" >> $HOME/.pip/pip.conf
# 下面这行是给 easy_install 用的
echo -e "[easy_install]\nindex-url = http://pypi.xxx.com/simple" >> $HOME/.pydistutils.cfg
```

以国内常用的豆瓣 pypi 为例，配置文件 pip.conf 文件内容如下（Linux 下的位置为 ${HOME}/.pip/pip.conf）

```ini
[global]
index-url = http://pypi.douban.com/simple
[install]
trusted-host = pypi.douban.com
```

trusted-host 的配置是因为服务是 http，不是 https，会有警告，设置信任的 http。

配置好之后，可以通过 pip 来尝试安装一个包来测试一下。

easy_install 的配置文件为 ${HOME/.pydistutils.cfg}，配置内容如下

```ini
[easy_install]
index-url = http://pypi.douban.com/simple
```

# 常见问题

## OSError: [Errno 31] Too many links
bandersnatch 运行一段时间后，开始报错，错误信息为 OSError: [Errno 31] Too many links。通过搜索发现在 [brandersnatch的文档](https://pypi.python.org/pypi/bandersnatch#operational-notes)中有说明，这个是文件系统子目录的32k限制，ext2 和 ext3 都有这个问题，ext4 没有类似限制。通过查看发现 web/simple 目录下的子目录个数为 31999 个。需要更换为 ext4 才可以解决这个问题，pypi 上的包太多了！

文档中的说明：

>Many sub-directories needed
>The PyPI has a quite extensive list of packages that we need to maintain in a flat directory. Filesystems with small limits on the number of sub-directories per directory can run into a problem like this:

>```
>2013-07-09 16:11:33,331 ERROR: Error syncing package: zweb@802449
>OSError: [Errno 31] Too many links: '../pypi/web/simple/zweb'
>```
>Specifically we recommend to avoid using ext3. Ext4 and newer does not have the limitation of 32k sub-directories.

# 参考

1. [Create a local PyPI mirror](https://aboutsimon.com/2012/02/24/create-a-local-pypi-mirror/)
1. [pep381client(pep381run) wont download packages from the official pypi server](http://stackoverflow.com/questions/17667835/pep381clientpep381run-wont-download-packages-from-the-official-pypi-server)
1. [brandersnatch](https://pypi.python.org/pypi/bandersnatch)
