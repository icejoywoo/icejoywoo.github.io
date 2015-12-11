---
layout: post
title: Linux 进程组、会话
category: linux
tags: ['linux','python']
---



# 相关系统调用

这些 Python API 都有对应的 Liunx 的系统调用
os.getpgid(pid)
os.getpgrp()
os.setpgrp()
os.setpgid(pid, pgrp)
os.tcgetpgrp(fd)
os.tcsetpgrp(fd, pg)
os.killpg(pgid, sig)

# 参考资料

1. https://blog.tonyseek.com/post/kill-the-descendants-of-subprocess/
2. https://www.win.tue.nl/~aeb/linux/lk/lk-10.html
