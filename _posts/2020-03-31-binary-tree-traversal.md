---
layout: post
title: 二叉树的三种遍历递归与迭代写法
category: algorithm
tags: ['algorithm', 'binary tree']
---

二叉树的前序（preorder）、中序（inorder）、后续（postorder）遍历是非常经典的遍历方式，其中中序遍历较为常用，因为二分查找树按照中序遍历获得的就是有序的数组。

三种遍历的定义：

- 前序遍历：根结点 -> 左子树 -> 右子树
- 中序遍历：左子树 -> 根结点 -> 右子树
- 后序遍历：左子树 -> 右子树 -> 根结点

遍历的实现如果使用递归的方式，就非常容易，与遍历的定义是一致的，不过迭代版本的实现就会复杂一些。

迭代写法的实现思路是通过栈来模拟递归的写法，通过这种方式来去掉递归调用，相对来说不太直观。其中，后序遍历的实现是最为复杂的，在 leetcode 中是 hard 难度的，其余两个是 medium 难度。

递归写法的套路，这里为了减少复制，采用了辅助函数，参数中包含一个输出参数，这是c++常用的一种传出结果的方式。

```cpp

void helper(TreeNode* root, vector<int>& res) {  // res 是结果
    // 递归终止条件
    if (!root) {
        return;
    }

    // 这里根据遍历的顺序来进行调整，即可实现三种遍历
    res.push_back(root->val);
    helper(root->left, res);
    helper(root->right, res);
}

```

使用栈来模拟的模拟套路是类似这样的结构，不同的情况会有一些变形，但是基本模板是这样的。

```cpp
stack<TreeNode*> s;
s.push(x);  // 初始化栈
while (!s.empty()) {  // 栈非空就继续遍历
    TreeNode* cur = s.top();
    s.pop();
    // do something
    
    s.push(x);  // 填充栈
}
```

## 二叉树节点定义

二叉树是包含一个值，左右两个子树，也就是两个指针。

```cpp
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};
```

## 前序遍历

### 递归写法

最直接的递归写法如下，缺点是会有比较多的元素复制操作。

```cpp
class Solution {
public:
    vector<int> preorderTraversal(TreeNode* root) {
        if (root == NULL) {
            return {};
        }

        vector<int> res;
        res.push_back(root->val);
        vector<int> left = preorderTraversal(root->left);
        res.reserve(left.size() + 1);
        res.insert(res.end(), left.begin(), left.end());
        
        vector<int> right = preorderTraversal(root->right);
        res.reserve(left.size() + 1 + right.size());
        res.insert(res.end(), right.begin(), right.end());
        return res;
    }
};
```

为了避免元素复制，可以采用一个辅助方法，将输出参数通过引用的方式传入，这样可以避免不必要的拷贝。

```cpp
class Solution {
public:
    vector<int> preorderTraversal(TreeNode* root) {
        vector<int> res;
        helper(root, res);
        return res;
    }

    void helper(TreeNode* root, vector<int>& seq) {
        if (!root) {
            return;
        }
        seq.push_back(root->val);
        helper(root->left, seq);
        helper(root->right, seq);
    }
};
```

### 迭代写法

通过 stack 来模拟递归调用的方式，需要注意的是这里入栈的顺序是先右后左，因为我们的遍历顺序是根左右，先遍历左边，栈的出栈是LIFO，所以需要把左子树入栈放在后面。


```cpp
class Solution {
public:
    vector<int> preorderTraversal(TreeNode* root) {
        if (!root) {
            return {};
        }
        vector<int> res;
        stack<TreeNode*> s;
        s.push(root);
        while (!s.empty()) {
            TreeNode* cur = s.top();
            s.pop();
            res.push_back(cur->val);
            // 注意：先右后左
            if (cur->right) {
                s.push(cur->right);
            }
            if (cur->left) {
                s.push(cur->left);
            }
        }
        return res;
    }
};
```

## 中序遍历

### 递归写法

```cpp
class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
       vector<int> res;
       helper(root, res);
       return res; 
    }

    void helper(TreeNode* root, vector<int>& res) {
        if (!root) {
            return;
        }
        helper(root->left, res);
        res.push_back(root->val);
        helper(root->right, res);
    }
};
```

### 迭代写法

中序遍历的方式是左根右，我们通过模拟思考递归的算法，会发现他首先的第一个遍历的节点是最左侧的叶子节点，所以这里有一个一直找最左侧节点的循环。

我们来分析最初的两步：

- 在寻找到最左侧的节点后，栈内的元素就已经将该左子树的根节点入栈了，这是第一次出栈的是最左侧节点，然后最左侧节点，只可能有或没有右子树
- 没有右子树，直接出栈最左侧节点的上一个根节点
- 有右子树，当前最右侧节点就是该右子树的根节点，访问该节点，也符合中序遍历的左根右

我们通过模拟递归的方式来分析该逻辑，思路上不是很直观，可以通过递归的调用过程来进行推演。

```cpp
class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        if (!root) {
            return {};
        }
        vector<int> res;
        stack<TreeNode*> s;
        TreeNode* cur = root;
        while (cur || !s.empty()) {
            while (cur) { // 寻找最左侧的节点
                s.push(cur);
                cur = cur->left;
            }
            cur = s.top();
            s.pop();
            res.push_back(cur->val);
            cur = cur->right;
        }
        return res; 
    }
};
```

## 后续遍历

### 递归写法

```cpp
class Solution {
public:
    vector<int> postorderTraversal(TreeNode* root) {
        vector<int> res;
        helper(root, res);
        return res;
    }
    void helper(TreeNode* root, vector<int>& res) {
        if (!root) {
            return;
        }

        helper(root->left, res);
        helper(root->right, res);
        res.push_back(root->val);
    }
};
```

### 迭代写法

后续遍历与前序遍历的关系

- 前序遍历：root, left, right
- 后续遍历: left, right, root

如何从前序遍历得到后续遍历，首先，调换 left 与 right 的位置，得到 root, right, left，然后再翻转 reverse，得到 left, right, root。

所以我们可以根据前序遍历的代码来改为后续遍历，唯一的区别就是，前序遍历的时候是先右后左，后续遍历是先左后右。最后再将结果进行翻转即可。

```cpp
class Solution {
public:
    vector<int> postorderTraversal(TreeNode* root) {
        if (!root) {
            return {};
        }
        vector<int> res;
        stack<TreeNode*> s;
        s.push(root);
        while (!s.empty()) {
            TreeNode* cur = s.top();
            s.pop();
            res.push_back(cur->val);
            // 注意：先左后右
            if (cur->left) {
                s.push(cur->left);
            }

            if (cur->right) {
                s.push(cur->right);
            }
        }
        reverse(res.begin(), res.end());  // 翻转
        return res;
    }
};
```

## 参考资料

1. [二叉树的前序遍历](https://leetcode-cn.com/problems/binary-tree-preorder-traversal/)
2. [二叉树的中序遍历](https://leetcode-cn.com/problems/binary-tree-inorder-traversal/)
3. [二叉树的后序遍历](https://leetcode-cn.com/problems/binary-tree-postorder-traversal/)
4. [二叉树前序、中序、后序遍历（深度优先搜索）的迭代解法](https://www.bilibili.com/video/BV1va4y1t7P8)