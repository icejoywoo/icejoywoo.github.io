---
layout: post
title: Flood Fill 算法解题实例分析
category: algorithm
tags: ['c++', 'algorithm']
---

# 概述

[Wikipedia](https://zh.wikipedia.org/wiki/Flood_fill) 对于*Flood fill算法*的定义是从一个区域中提取若干个连通的点与其他相邻区域区分开（或分别染成不同颜色）的经典算法。因为其思路类似洪水从一个区域扩散到所有能到达的区域而得名。

最简单的实现思路就是深度优先搜索的递归方法，从一个点根据规则去扩散到各个可以到达的地方。这个思路对于我们日常解决一些算法问题还是非常有帮助的，本文就介绍两道问题，可以使用 Flood Fill 算法的思路。

# 岛屿数量

岛屿数量[leetcode 200](https://leetcode.cn/problems/number-of-islands/description/)是一道并查集的经典题目，其实该题也可以使用 Flood Fill 算法的思路，就是每发现一个陆地就遍历所有连通的陆地，将其进行染色标记，然后去寻找下一个岛屿的陆地，直至遍历结束。


题目是给一个二维网格，1表示陆地，0表示水，连通性是上下左右。下面通过实例来讲解整体的思路。

以题目中的例子来讲解。
```
["1","1","0","0","0"]
["1","1","0","0","0"]
["0","0","1","0","0"]
["0","0","0","1","1"]
```
1. 起点是所有的陆地节点，所以需要遍历二维网格，找到一片未被标记过的陆地作为起点。第一个节点(0, 0)就是陆地，所以这里就是染色的起点。
2. 首先，将岛屿数量+1。然后开始从起点染色，染色就是修改节点的值，可以修改为2，表明这片陆地已经被其他岛屿占有了。从起点开始，递归从上下左右开始寻找与起点可以连通的陆地，都进行染色。示例中节点(0, 0)相关的陆地都标记。
```
["2","2","0","0","0"]
["2","2","0","0","0"]
["0","0","1","0","0"]
["0","0","0","1","1"]
```
3. 继续遍历，寻找下一片未被标记过的陆地，也就是值为1的，这时，会找到(2, 2)节点，继续步骤2，直至遍历完所有的节点。
```
["2","2","0","0","0"]
["2","2","0","0","0"]
["0","0","2","0","0"]
["0","0","0","1","1"]
```

整理的思路就是这样，相对来讲思路比较简单清晰，代码也比较好实现。
```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int n = grid.size();
        int m = grid[0].size();
        
        int res = 0;

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == '1') {
	                res++;
	                traverse(grid, i, j);
            	}
            }
        }

        return res;
    }

    void traverse(vector<vector<char>>& grid, int i, int j) {
        int n = grid.size();
        int m = grid[0].size();
        if (i < 0 || i >= n || j < 0 || j >= m) {
            return;
        }
        if (grid[i][j] != '1') {
            return;
        }
        // 染色为 2
        grid[i][j] = '2';
        
        traverse(grid, i-1, j);
        traverse(grid, i+1, j);
        traverse(grid, i, j-1);
        traverse(grid, i, j+1);
    };
};
```

# 统计参与通信的服务器

统计参与通信的服务器[leetcode 1267](https://leetcode.cn/problems/count-servers-that-communicate/description/)是在 leetcode 每日一题中碰到的，通过阅读题目，发现其整体上与岛屿问题很类似：二维网格，1和0，连通性。

连通性是最大的差别，1表示服务器，当两个服务器在同一行或者同一列的时候，就可以互相通信。

题目是求连通的服务器个数，这里也是与岛屿问题不同的地方，如果只有一个服务器的话，就无法连通，结果加0，而岛屿问题中这个也是一个岛屿；如果有两个或以上的服务器，就可以连通，结果就要加上服务器的个数。

```cpp
class Solution {
public:
    int countServers(vector<vector<int>>& grid) {
        int n = grid.size();
        int m = grid[0].size();
        int res = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                int count = 0;
                if (grid[i][j] == 1) {
                    traverse(grid, i, j, count);
                    if (count > 1) res += count;
                }
            }
        }
        return res;
    }

    void traverse(vector<vector<int>>& grid, int i, int j, int& count) {
        int n = grid.size();
        int m = grid[0].size();
        if (i < 0 || i >= n || j < 0 || j >= m) {
            return;
        }
        if (grid[i][j] != 1) {
            return;
        }

        count++;
        // 遍历过的节点标记为2
        grid[i][j] = 2;

        // 按行递归遍历
        for (int k = 0; k < m; k++) {
            if (k != j && grid[i][k] == 1) {
                traverse(grid, i, k, count);
            }
        }

        // 按列递归遍历
        for (int k = 0; k < n; k++) {
            if (k != i && grid[k][j] == 1) {
                traverse(grid, k, j, count);
            }
        }
    }
};
```

# 结语

Flood fill 算法思想还是非常巧妙的，灵活应用确实可以简化代码实现，而且思路更加清晰。

# 参考资料

1. [Flood Fill - Wikipedia](https://zh.wikipedia.org/wiki/Flood_fill)
2. [leetcode 200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/description/)
3. [leetcode 1267. 统计参与通信的服务器](https://leetcode.cn/problems/count-servers-that-communicate/description/)
