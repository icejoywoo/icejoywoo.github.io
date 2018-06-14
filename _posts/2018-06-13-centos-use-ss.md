---
layout: post
title: CentOS 服务器配置 shadowsocks client 连接网络
category: network
tags: ['shadowsocks']
---

# 简介

在服务器端配置 ss，用于下载和安装 docker 等。

# shadowsocks

## 安装

使用了 python shadowsocks

最简单方便的方法就是安装 epel 源和 python-pip 包

```bash
sudo yum -y install epel-release
sudo yum -y install python-pip
```

通过 pip 安装 shadowsocks

```bash
sudo pip install shadowsocks
```

## 配置

新建配置文件夹和配置文件

```bash
sudo mkdir /etc/shadowsocks
sudo vi /etc/shadowsocks/shadowsocks.json
```

shadowsocks.json 配置如下

```json
{
    "server":"1.1.1.1",
    "server_port":1035,
    "local_address": "127.0.0.1",
    "local_port":1080,
    "password":"password",
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": false,
    "workers": 1
}
```

配置说明：

1. server：Shadowsocks服务器地址
2. server_port：Shadowsocks服务器端口
3. local_address：本地IP，本地使用的 sock5 代理 ip
4. local_port：本地端口，本地使用的 sock5 代理端口
5. password：Shadowsocks连接密码
6. timeout：等待超时时间
7. method：加密方式
8. workers:工作线程数
9. fast_open：true或false。开启fast_open以降低延迟，但要求Linux内核在3.7+。开启方法 echo 3 > /proc/sys/net/ipv4/tcp_fastopen

上述配置需要根据情况进行修改，接下来需要启动服务，就可以通过 local_address 和 local_port 来使用 sock5 代理，流量就可以走 ss 了

## 配置启动脚本

配置启动脚本文件 /etc/systemd/system/shadowsocks.service

```
[Unit]
Description=Shadowsocks

[Service]
TimeoutStartSec=0
ExecStart=/usr/bin/sslocal -c /etc/shadowsocks/shadowsocks.json

[Install]
WantedBy=multi-user.target
```

启用启动脚本，启动 ss 服务

```bash
# 配置服务开机启动
sudo systemctl enable shadowsocks.service
# 启动服务
sudo systemctl start shadowsocks.service
# 查看服务状态
sudo systemctl status shadowsocks.service
```

验证安装

```
$ curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
{"origin":"x.x.x.x"}
```

至此就完成了 ss 客户端的安装配置。

# proxychains

proxychains 的官方介绍：

> proxychains ng (new generation) - a preloader which hooks calls to sockets in dynamically linked programs and redirects it through one or more socks/http proxies.

proxychains 是一种访问代理的方式，用法如下：

```bash
proxychains4 curl http://httpbin.org/ip
```

这样可以使得 curl 走代理来访问网络。

## 安装

首先去 [proxychains 官网](https://github.com/rofl0r/proxychains-ng) 下载代码进行编译安装，常规的 configure && make 方式，没啥特别之处。

```
./configure

make -j

sudo make install
```

## 配置

创建配置文件

```bash
mkdir -p ~/.proxychains
vi ~/.proxychains/proxychains.conf
```

proxychains.conf 配置如下：

```
strict_chain
proxy_dns
remote_dns_subnet 224
tcp_read_time_out 15000
tcp_connect_time_out 8000
localnet 127.0.0.0/255.0.0.0
quiet_mode

[ProxyList]
socks5  127.0.0.1 1080
```

ProxyList 的配置要与上面的 ss 配置一致，即可通过代理访问网络，使用起来还是很方便的。

# 参考资料

1. [CentOS 7安装配置Shadowsocks客户端](https://www.zybuluo.com/ncepuwanghui/note/954160)
2. [Using Shadowsocks with Command Line Tools](https://github.com/shadowsocks/shadowsocks/wiki/Using-Shadowsocks-with-Command-Line-Tools)
