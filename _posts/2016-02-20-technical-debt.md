---
layout: post
title: 对技术债务的一些理解
category: 其他
tags: ['技术债务']
---

# 简介

我们先来看看这个概念：技术债务是由 Ward Cunningham 首次提出的，是一个术语，指的是开发团队在设计或架构选型时从短期效应的角度选择了一个易于实现的方案，但从长远来看，这种方案会带来更消极的影响，亦即开发团队所欠的债务。

这个债务和金融债务非常类似，如果这个项目一直持续下去，这种债务会不断地产生，如果控制的不好，一般导致的结果有两种：死掉和重写。

虽然这个概念或许陌生，或许有些抽象，但现实中其实时时刻刻都在上演着。

# 债务的产生

各种各样的情况可以产生债务，大部分项目的技术债务产生的过程都是类似的。

一般，首先是新建立一个项目，这个时候一切从零开始，这个时候是没有债务的，这个时期的特点是：项目周期短，需要快速上线；需求不是十分明确，经常会发生改变；人力不足，经常加班加点的干活，最开始很可能是一两个人在搞。之后 1.0 版本上线了，整体项目的设计比较简单，代码结构也还算清晰。一般来说，有一些 hard code 和 magic number，有不少实现偷懒了，比较粗糙，这些是最初的一些债务。

很快，项目需要进行下一个迭代，引入了非常多新的需求，之前的部分功能实现需要比较多的改动才可以支持，这一轮的迭代可能会去将之前偷懒的一些实现改得更好更灵活，也可以只满足这次的新需求即可，这个完全取决于开发团队或者程序员个人的想法。这个时候，开发团队开始扩张，加入了新人，不同的编程风格，重新对项目开始进行熟悉，也实现了一些功能，这部分代码可能因为经验欠缺，或者对项目之前的实现不够了解，而引入了一些新的问题。比如，新人不知道已经实现了类似的功能，导致重复实现，造成代码冗余。不过，项目功能都可以实现，而且在线上稳定的运行着。

如此不断地增加新功能，不断地开发，代码不断地增多，产品的用户不断增多，肯定会或多或少地碰到一些问题：新功能的开发越来越慢，每增加一些代码，会导致其他一些地方出现问题，导致单个功能的开发周期变长；很多功能耦合在一起，新的功能需要对很多地方进行修改，以前的功能写死了很多东西，动一发牵动全身等等。

这种技术债务是迟早需要还的，但是还债的人不一定是最初的开发人员，这种情况在现实中非常常见。现实中，很多公司的新项目那拨人为了压缩项目周期，肯定会产生大量的技术债务，而且在实现的选择上肯定是偏向简单粗暴的方式，造成这种情况的原因有很多，我个人觉得非常主要的原因是大多数公司的 KPI 文化。当初把 KPI 定到非常漂亮，现在必然只能粗暴快速完成 KPI，势必导致开发团队只顾眼前利益，而且新项目的 KPI 一般都是非常重的，非常容易有大的产出。第一批开发团队开发完项目后，很快会有各种变动，最后维护和修 bug 人早就不是最初的那拨人了。这种东西就是俗称的“坑”，所以也有一句非常形象的说法：“前人挖坑，后人填坑”，一般来讲，后期维护的人不会有太大的产出，但是工作量却是非常大的，这是对之前技术债务的偿还。这种场景在大公司内应该属于比较常见的。

# 如何避免

技术债务是无法避免的，我们应该思考如何对技术债务进行足够的控制，使其在可控范围内，不至于整个项目失控，这个是技术管理里面非常重要的技能。

技术债务都是人为的，一线开发人员的整体水平决定了技术债务的大小，个人水平很大程度上起决定性作用，这个方面只能靠团队建设，不断培养新员工来逐步解决。

另外，从项目开发流程上也是可以进行控制。这里主要是我个人的一些认知和总结，说说我自己的理解。

一般的开发流程大致包括：需求、设计、功能开发、单元测试、测试。

需求这块很多时候一线开发人员是无法直接参与的，但是好的开发人员应该去了解这些需求是如何产生的，需求的目标是怎样的，这样有利于产品的设计实现。因为产品相关的人提的需求一般来说是从非技术人员的角度来出发的，你是从技术人员的角度出发来看这些问题的，你是可以提出一些更好实现并且满足需求出发点的想法，这个会使得你对整个项目更了解，更有把握。需求的讨论可以在比较确定的时候，将开发团队也拉入进来，进行一次评审，让大家更了解项目，这样是非常有利于项目开发的。

设计对于一个项目来说是非常关键的，整体架构的选取是非常关键的，如果整体架构不过灵活并且存在巨大缺陷，那么因此产生的技术债务很可能直接导致项目失败。设计不要藏着掖着，不要一个人蒙头去搞，然后就去编码，最后搞出一个有严重缺陷的东西。这种情况我是深有体会的，因此而产生的问题可能非常难以修复。设计无分大小，要培养一种团队的意识，我设计了一个模块，需要和大家商讨一下，听取大家的意见，或者比较关键的设计可以进行一次评审会议，尽可能地及早发现问题，不要在一个错误的设计上走太久。程序员有一种“文人相轻”的天性，希望大家保持一个开发的心态，多去与人沟通交流，闭门造车造的大多是垃圾，不要想当然认为自己是天才。设计是可以积累和沉淀的，形成一些比较通用的框架等。

功能开发是代码实现的部分，代码规范是必不可少的，有助于统一团队的代码风格，这个非常有助于相阅读代码，不止是你阅读别人的代码，也有可能是你阅读你自己之前写的代码。不要在这个地方偷懒，除非你的项目不需要维护。代码规范最好有一些工具来进行检查，这样才能体现规范的价值。code review 是另外一个非常有效的保障机制，但是比较难实践，而且很耗时。我个人会尽量去阅读别人实现的代码，阅读代码是学习交流的过程，可以提出你自己的建议，也可以学到别人的代码技巧。code review 是一个比较难于实践的方式，也需要工具的支持才可以进行，但是好的开发人员应该去阅读别人的代码。

单元测试（简称单测）是一种非常好的工具，衡量的标准是代码覆盖率和分支覆盖率。单元测试对于项目代码维护来说是非常重要的，经常会有一种情况，你要修改代码的一个部分，你只关注了这个点，改完之后，发现其他很多地方都出问题了，开始定位问题，这个过程可能会非常耗时，而且你很有可能引入了其他的未发现的问题。如果有较为完备的单测，你在修改后，只需要增加新的单测，并且保证所有单测通过，你就可以在很大程度上避免引入了新的 bug。单元测试给了你重构代码的信心，并且单测的编写可以给你一次审视自己实现的机会，会帮助你写出更好的实现代码。

项目的测试是非常重要的，测试如何做到尽可能的自动化，非常方便快速的回归测试，测试可以从更高地层面上控制系统的技术债务。相对完备的测试可以使得项目的质量得到保障，也可以判断当前项目的技术债务的多少。项目如果非常难以测试，其实说明项目本身的技术债务已经比较重了，应该适当地进行重构。

# 总结

技术债务是伴随着项目的，无法避免，但是如何保持其在可控范围之内，是我们应该思考的问题。技术债务的避免和消除都需要好的优秀的开发人员，人始终是软件开发中最重要的因素。作为一名普通的码农，不断地提升自己是非常必要的。

# 参考资料

1. [解析技术债务](http://www.infoq.com/cn/news/2009/10/dissecting-technical-debt/)