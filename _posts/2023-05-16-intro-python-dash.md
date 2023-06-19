---
layout: post
title: Pandas + Plotly + Dash 数据可视化
category: python
tags: ['python', 'dash']
---

# 概述

使用 Python 进行数据分析是非常方便的，笔者在工作中需要对数据进行分析时发现了一套 Pandas + Plotly + Dash 的数据可视化方案，非常简洁实用。

Pandas 是一个非常方便的数据分析工具，可以使用 plotly 将 Pandas 的数据进行可视化，Dash 可以直接使用 Python 开发 Web 页面，并且也支持 plotly 图表展示，这样就可以使用纯 Python 代码来开发数据分析的可视化页面。

# 使用示例

## pandas snippets

pandas 进行数据的加载和处理，这里列举了几个代码片段，都是笔者在开发中常用的几个方法。

```python
# 数据保存到本地文件，去除index，可以使用压缩。
pandas.to_csv(df, index=False, compression='gzip')

# to_csv 的时候不设置 index=False 的话，加载的数据会多一列 index
pandas.read_csv(df, compression='gzip')

# 使用 merge 来进行 join 操作
# how 可配置 left、right
# left_on 配置的是左表的字段
# right_on 配置的是右表的字段
pandas.merge(df_a, df_b, how='left', left_on='a_col', right_on='b_col')

# 根据 a 列聚合求和count，并且根据count的和从大到小排序，取 top 10
result = df.groupby(['a'])['count'].sum()
result.sort_values(asceeding=False, inplace=True)
result.head(10).reset_index()
```

## plotly express

jupyter notebook 是数据分析的常用工具，配合上 plotly express 可以方便画图，可以对 pandas dataframe 进行可视化，并且其图是支持交互的。

```python
# in jupyter notebook

import plotly.express as px
df = px.data.iris()
fig = px.scatter(df, x="sepal_width", y="sepal_length", color="species")
fig.show()
```

详细参考[官方文档](https://plotly.com/python/plotly-express/)

## Dash Web

[这里](https://github.com/CNFeffery/DataScienceStudyNotes)有大量可以参考的文章，可以去找一些示例代码来使用。

页面每次打开都刷新 layout 的方法，app.layout 可以设置为一个方法，这样就可以每次加载页面的时候进行更新。当你需要每次更新一些变量的时候就会很有用，例如更新每天的日期。

```python
app = Dash()

def layout():
	return ...

app.layout = get_layout
```

注意 Dash 新旧版本的 module 已经发生变化，python2 只支持旧版本，下面是一段参考代码。

```python
import six
import sys

if six.PY2:
    from dash import Dash, dash_table
    from dash.dash_table import FormatTemplate
    from dash.dependencies import Output, Input, State
    import dash_html_components as html
    import dash_core_components as dcc
elif six.PY3:
    from dash import Dash, Output, Input, State, html, dcc, dash_table
    from dash.dash_table import FormatTemplate
else:
    print("failed to import dash library", file=sys.stderr)
    sys.exit(-1)
```

# 参考资料

* [Plotly Express in Python](https://chengjun.github.io/mybook/19-visualization-plotly-express.html)
* [吹爆了这个可视化神器，上手后直接开大~](https://mp.weixin.qq.com/s/dg390bbxA_LEoggWg6dGlQ)
* [Plotly Express in Python](https://plotly.com/python/plotly-express/)
* [用Python当中Plotly.Express模块绘制几张图表，真的被惊艳到了](https://zhuanlan.zhihu.com/p/531651479)
* [How can we create data columns in Dash Table dynamically using callback with a function providing the dataframe](https://stackoverflow.com/questions/55801796/how-can-we-create-data-columns-in-dash-table-dynamically-using-callback-with-a-f)
* [Python+Dash快速web应用开发——回调交互篇（下）](https://www.cnblogs.com/feffery/p/14386458.html)
* [Dash_table基础](https://blog.csdn.net/yuetaope/article/details/121355310)
