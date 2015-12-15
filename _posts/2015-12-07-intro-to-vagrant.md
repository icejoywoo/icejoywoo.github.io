---
layout: post
title: Vagrant 简介
category: vagrant
tags: ['vagrant', 'python']
---

Vagrant 是一款用来构建虚拟开发环境的工具，非常适合 php/python/ruby/java 这类语言开发 web 应用，是程序员的虚拟机，有助于中开发环境模拟真实环境，使用相同的系统和干净的环境。

Vagrant 支持 VirtualBox 和 VMWare 虚拟机，本来以 VirtualBox 为例讲解，VirtualBox 是一款优秀的免费虚拟机。

# 安装

## 安装 VirtualBox

从 [VirtualBox 官网下载地址](https://www.virtualbox.org/wiki/Downloads)来下载相应系统的版本，并安装。

## 安装 Vagrant

从 [Vagrant 发布版本](https://releases.hashicorp.com/vagrant/) 或 [Vagrant 下载页面](https://www.vagrantup.com/downloads.html)来下载相应系统的版本，并安装。

# 快速入门

Vagrant 是一套使用 ruby 编写的工具，对虚拟机的使用进行了封装，可以通过配置文件和命令来进行操作。本节主要介绍大致的使用流程。

*注意：运行下面的命令需要有外网连接，因为国内网络的问题，导致下载 box 的速度比较慢，下载太慢的同学请看后面，或者可以通过 VPN 等方式来加速。*

```bash
$ mkdir hello-vagrant
$ cd hello-vagrant

# 初始化
$ vagrant init hashicorp/precise64
A `Vagrantfile` has been placed in this directory. You are now
ready to `vagrant up` your first virtual environment! Please read
the comments in the Vagrantfile as well as documentation on
`vagrantup.com` for more information on using Vagrant.

# 启动
$ vagrant up
Bringing machine 'default' up with 'virtualbox' provider...
==> default: Importing base box 'hashicorp/precise64'...
==> default: Matching MAC address for NAT networking...
==> default: Checking if box 'hashicorp/precise64' is up to date...
==> default: Setting the name of the VM: hello-vagrant_default_1449487645706_86921
==> default: Fixed port collision for 22 => 2222. Now on port 2200.
==> default: Clearing any previously set network interfaces...
==> default: Preparing network interfaces based on configuration...
    default: Adapter 1: nat
==> default: Forwarding ports...
    default: 22 => 2200 (adapter 1)
==> default: Booting VM...
==> default: Waiting for machine to boot. This may take a few minutes...
    default: SSH address: 127.0.0.1:2200
    default: SSH username: vagrant
    default: SSH auth method: private key
    default:
    default: Vagrant insecure key detected. Vagrant will automatically replace
    default: this with a newly generated keypair for better security.
    default:
    default: Inserting generated public key within guest...
    default: Removing insecure key from the guest if it is present...
    default: Key inserted! Disconnecting and reconnecting using new SSH key...
==> default: Machine booted and ready!
==> default: Checking for guest additions in VM...
    default: The guest additions on this VM do not match the installed version of
    default: VirtualBox! In most cases this is fine, but in rare cases it can
    default: prevent things such as shared folders from working properly. If you see
    default: shared folder errors, please make sure the guest additions within the
    default: virtual machine match the version of VirtualBox you have installed on
    default: your host and reload your VM.
    default:
    default: Guest Additions Version: 4.2.0
    default: VirtualBox Version: 5.0
==> default: Mounting shared folders...
    default: /vagrant => /path/to/your/hello-vagrant

# ssh 连接到 vagrant 新建的虚拟机上
$ vagrant ssh
Welcome to Ubuntu 12.04 LTS (GNU/Linux 3.2.0-23-generic x86_64)

 * Documentation:  https://help.ubuntu.com/
New release '14.04.3 LTS' available.
Run 'do-release-upgrade' to upgrade to it.

Welcome to your Vagrant-built virtual machine.
Last login: Fri Sep 14 06:23:18 2012 from 10.0.2.2
vagrant@precise64:~$
```

鉴于国内网络环境问题，可以预先下载 box 镜像。box 是 Vagrant 的一个虚拟机包，box 包含了虚拟机所需的基本文件。

Ubuntu 的两个 box：
1. [Ubuntu precise 32 VirtualBox](http://files.vagrantup.com/precise32.box)
2. [Ubuntu precise 64 VirtualBox](http://files.vagrantup.com/precise64.box)

百度云盘的 [precise64.box 下载地址](http://pan.baidu.com/s/1ntRg94l)。

```bash
# 下载 box（可以使用其它工具来，这里仅仅是示例）
$ wget http://files.vagrantup.com/precise64.box
# 添加本地 box 到 vagrant 里
$ vagrant box add ubuntu precise64.box

$ mkdir hello-vagrant
$ cd hello-vagrant

# 初始化
$ vagrant init ubuntu
# 启动虚拟机，虚拟机不存在会进行创建
$ vagrant up
# ssh 连接到 vagrant 新建的虚拟机上
$ vagrant ssh
```

*注意：vagrant ssh 在 windows 上可能需要 Cygwin、MinGW 或 Git 等软件中的一个。*

# 深入 Vagrant

本节只会对一些基本的功能和使用方法进行讨论，为大家后续自行学习扫清一些概念的障碍，使大家对 Vagrant 有一个基本的认识，算不是真正的“深入”。如果要真的深入理解 Vagrant，建议去阅读官方文档。

# 常用子命令

vagrant 对虚拟机的使用进行了命令的封装，虚拟机操作非常方便。

```bash
$ vagrant init  # 初始化
$ vagrant up  # 启动虚拟机
$ vagrant halt  # 关闭虚拟机
$ vagrant reload  # 重启虚拟机
$ vagrant ssh  # SSH 到虚拟机
$ vagrant status  # 查看虚拟机运行状态
$ vagrant destroy  # 销毁当前虚拟机
$ vagrant package # 在退出当前虚拟机后，打包当前虚拟机环境，用于分发
```

# box 管理

在下面两个地方可以找到 box：
1. Vagrant box 官方网站：https://atlas.hashicorp.com/boxes/search
2. 民间的 box 整理网站：http://www.vagrantbox.es/

box 的管理依赖 Vagrant 里面的子命令 box。

```bash
# 官网 box 的添加与其它方式不同
# 添加一个网络上的 box，box-address 是官方的简写路径
$ vagrant box add <box-address>

$ vagrant box add ubuntu/trusty64

# 添加一个下载到本地的 box，或者是一个 box 的 url，必须指定 box 的名字
$ vagrant box add <box-name> <box-path>

# box url
$ vagrant box add centos70 https://github.com/tommy-muehle/puppet-vagrant-boxes/releases/download/1.1.0/centos-7.0-x86_64.box
# 本地 box
$ vagrant box add ubuntu precise64.box

# 列出所有的 box
$ vagrant box list
dongweiming/code    (virtualbox, 0.1)
hashicorp/precise32 (virtualbox, 1.0.0)
hashicorp/precise64 (virtualbox, 1.1.0)

# 删除 box
$ vagrant box remove dongweiming/code
Box 'dongweiming/code' (v0.1) with provider 'virtualbox' appears
to still be in use by at least one Vagrant environment. Removing
the box could corrupt the environment. We recommend destroying
these environments first:

default (ID: 8d32b05bf9c54ce5aeb5fd27a5b42657)

Are you sure you want to remove this box? [y/N] y
Removing box 'dongweiming/code' (v0.1) with provider 'virtualbox'...
```

如果想了解更多细节和选项，清阅读官方文档中[关于 box 子命令的部分](https://docs.vagrantup.com/v2/cli/box.html)。

# Vagrantfile 简单说明

配置文件采用 ruby 语法，默认生成的配置文件有很多注释，理解起来相对容易。对于一般的使用来说，只需要关注几个点即可。

1. 使用什么 box，config.vm.box。
2. vagrant 的网络配置，主要是为了可以访问虚拟机中的服务，例如数据库或 HTTP Server 等。
3. 虚拟机的资源配置，CPU 和内存等。
4. vagrant 在虚拟机启动后，默认会把当前工程的目录映射到虚拟机的 /vagrant 目录下，另外也可以单独配置目录的映射，mount 本机的目录到虚拟机上。
5. provision 是 vagrant 提供的一种机制，主要用于环境的初始化，安装软件、修改配置等。

关于provision的触发方式需要特别说明一下

1. 第一次运行 vagrant up
2. vagrant up --provision
3. vagrant provision
4. vagrant reload --provision

下面是一个比较完整的示例，是笔者的 Python 开发环境配置。

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  # 配置虚拟机使用的 box
  config.vm.box = "hashicorp/precise32"

  # 如果使用非官方的 box，配置 box 的 url
  # config.vm.box = "precise64"
  # config.vm.box_url = "http://files.vagrantup.com/precise64.box"

  # 如果使用本地方法添加的 box，配置 box add 时使用的 box name 即可
  # config.vm.box = "precise64"

  # 关闭更新检查，每次启动的时候少一次检查，开启会快一点
  config.vm.box_check_update = false

  # 端口映射，guest 是指虚拟机，host 是指本机
  config.vm.network "forwarded_port", guest: 8987, host: 8987

  # 配置内部 ip，可以通过 ip 来访问虚拟机的服务
  config.vm.network "private_network", ip: "192.168.33.10"

  config.vm.provider "virtualbox" do |vb|
     # 虚拟机内存大小
     vb.memory = "1024"

     # cpu 设置
     vb.cpus = 2
  end

  # provision 是 vagrant 提供的一个机制，用于初始化虚拟机环境，这里配置的是 shell
  config.vm.provision "shell", inline: <<-SHELL
    # sources.list.precise 为网易 163 的 ubuntu 源配置文件
    sudo cat /vagrant/sources.list.precise > /etc/apt/sources.list
    sudo mkdir -p /home/vagrant/.pip/
    sudo echo -e "[global]\nindex-url = http://pypi.douban.com/simple" >> /home/vagrant/.pip/pip.conf
    sudo echo -e "[install]\ntrusted-host = pypi.douban.com" >> /home/vagrant/.pip/pip.conf
    sudo apt-get update
    sudo apt-get install -y python-pip python-dev build-essential libxml2-dev libxslt-dev
    sudo pip install -r /vagrant/requirements.txt
  SHELL
end
```

# 其它

vagrant 拥有 plugin 插件系统，可以通过 plugin 子命令进行插件的管理。

常用插件有：

1. [vagrant-hostmanager](https://github.com/smdahlen/vagrant-hostmanager)
2. [vagrant-hosts](https://github.com/oscar-stack/vagrant-hosts)

# 参考资料

1. [使用 Vagrant 打造跨平台开发环境](http://segmentfault.com/a/1190000000264347)
2. [Vagrant documentation](https://docs.vagrantup.com/v2/)
