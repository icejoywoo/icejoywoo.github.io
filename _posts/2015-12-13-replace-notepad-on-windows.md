---
layout: post
title: 替换 Windows 下的 Notepad
category: other
tags: ['windows','notepad']
---

Windows 下简陋的记事本非常难用，对于程序员来说一些特殊格式会导致一些奇怪的问题。目前大多数人都会使用记事本的替代品，我个人比较喜欢 Notepad++，一款非常好用的记事本。

有了替代品之后，就是如何替代这个记事本的问题了。直接替换 notepad.exe 二进制的方法，太暴力了。本着折腾的精神，寻找一种更好的方式，无需破坏系统自带软件。

经过一番 Google 之后，发现了Image File Execution Options，在 stackoverflow 上，发现一款软件专门替换 Notepad 的软件 Notepad Replacer，直接双击安装，安装过程中会要求选择替换 Notepad 用的记事本二进制的路径，选择完之后即可，安装完后立刻生效。

可以去注册表中查看 HKLM\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\notepad.exe 这个路径下的注册表信息已被 Notepad Replacer替换。

替换之后，WAMP 托盘图标打开各种配置文件都是 Notepad++，方便很多。

# 参考资料

1. [Set “Image File Execution Options” will always open the named exe file as default](http://stackoverflow.com/questions/2984846/set-image-file-execution-options-will-always-open-the-named-exe-file-as-defaul)
2. [Notepad Replacer software](http://www.binaryfortress.com/NotepadReplacer)
