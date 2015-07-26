---
layout: post
title: Hello, World
category: others
tags: ['hello']
disqus: true
---
## {{ page.title }}
开始构建最近的技术博客，记录自己的点滴成长。
{% highlight ruby %}
def show
  @widget = Widget(params[:id])
  respond_to do |format|
    format.html # show.html.erb
    format.json { render json: @widget }
  end
end
{% endhighlight %}

```python
print "hello"
```
{{ page.date | date_to_string }}
