# 8. knot 到底是什么？

这是初学 B-Spline 最容易抽象的地方。

可以先把 knot 理解成：

> 参数轴上划分不同 polynomial segment 的位置。

比如：

$$
U=
\{0,1,2,3,4\}.
$$

那么参数轴被切成：

```text
0------1------2------3------4
```

也就是若干 knot span：

$$
[0,1),
$$

$$
[1,2),
$$

$$
[2,3),
$$

$$
[3,4).
$$

B-Spline 在每一个这样的区间里面，本质上都是一个普通多项式。

所以 B-Spline 本质上是：

$$
\boxed{
\text{piecewise polynomial}
}
$$

即：

$$
\boxed{\text{分段多项式}}
$$

---

# 9. 从最简单的 B-Spline 开始：0 次

不要直接看 cubic。

先从：

$$
p=0
$$

开始。

这是最简单的 B-Spline basis。

定义：

$$
\boxed{
N_{i,0}(u)
=

\begin{cases}
1, & u_i\leq u<u_{i+1},\\
0, & \text{otherwise}.
\end{cases}
}
$$

什么意思？

假设 knot vector 是：

$$
U=\{0,1,2,3,4\}.
$$

那么：

$$
N_{0,0}(u)
=

\begin{cases}
1,&0\leq u<1,\\
0,&\text{其他}.
\end{cases}
$$

$$
N_{1,0}(u)
=

\begin{cases}
1,&1\leq u<2,\\
0,&\text{其他}.
\end{cases}
$$

$$
N_{2,0}(u)
=

\begin{cases}
1,&2\leq u<3,\\
0,&\text{其他}.
\end{cases}
$$

等等。

图像大概就是：

```text
N0
1 ─────
      |
0     └────────────────
  0   1   2   3

N1
        ┌─────
        |
0 ──────┘     └───────
  0   1   2   3
```

这就是一个个“方块”。

---

# 10. 0 次 B-Spline 曲线是什么样？

假设控制点为

$$
\mathbf P_0,\mathbf P_1,\mathbf P_2,\mathbf P_3.
$$

曲线：

$$
\mathbf C(u)
=

\sum_iN_{i,0}(u)\mathbf P_i.
$$

考虑：

$$
0\leq u<1.
$$

此时只有

$$
N_{0,0}(u)=1
$$

其他都为 $0$。

因此：

$$
\mathbf C(u)=\mathbf P_0.
$$

当

$$
1\leq u<2
$$

时：

$$
\mathbf C(u)=\mathbf P_1.
$$

所以 0 次 B-Spline 根本不是“平滑曲线”，而是：

```text
P0      P1      P2      P3
●       ●       ●       ●
```

参数走到哪个区间，就直接输出哪个控制点。

也就是：

$$
\boxed{\text{piecewise constant}}
$$

---

# 11. 为什么要从这个奇怪东西开始？

因为高次 B-Spline basis 就是从这些 0 次 basis 一层一层插值得到的。

这一点和 Bézier 的 de Casteljau 非常像。

B-Spline 的核心递推公式叫：

$$
\boxed{\text{Cox–de Boor recursion}}
$$

对于 $p>0$：

$$
\boxed{
N_{i,p}(u)
=

\frac{u-u_i}{u_{i+p}-u_i}
N_{i,p-1}(u)
+
\frac{u_{i+p+1}-u}{u_{i+p+1}-u_{i+1}}
N_{i+1,p-1}(u)
}
$$

如果某个分母为 $0$，对应那一项约定为 $0$。

先别急着记这个公式。

我们直接拿它构造一次 B-Spline。

---

# 12. 一次 B-Spline：$p=1$

我们取均匀 knot：

$$
U=\{0,1,2,3,4\}.
$$

考虑 basis：

$$
N_{1,1}(u).
$$

根据递推公式：

$$
N_{1,1}(u)
=

\frac{u-u_1}{u_2-u_1}N_{1,0}(u)
+
\frac{u_3-u}{u_3-u_2}N_{2,0}(u).
$$

因为：

$$
u_1=1,
\qquad
u_2=2,
\qquad
u_3=3,
$$

所以：

$$
N_{1,1}(u)
=

(u-1)N_{1,0}(u)
+
(3-u)N_{2,0}(u).
$$

现在分区间看。

---

# 13. 在区间 $[1,2)$

如果

$$
1\leq u<2,
$$

那么：

$$
N_{1,0}(u)=1,
$$

而

$$
N_{2,0}(u)=0.
$$

所以：

$$
N_{1,1}(u)
=

u-1.
$$

也就是说它从：

$$
0
$$

线性增长到：

$$
1.
$$

---

# 14. 在区间 $[2,3)$

此时：

$$
N_{1,0}(u)=0,
$$

$$
N_{2,0}(u)=1.
$$

因此：

$$
N_{1,1}(u)
=

3-u.
$$

于是它又从：

$$
1
$$

线性下降到：

$$
0.
$$

所以整个 $N_{1,1}$ 长这样：

```text
          1
          /\
         /  \
        /    \
0 _____/      \_____
      1   2    3
```

这是一个三角形。

---

# 15. 这里第一次看到 B-Spline 的核心：local support

注意：

$$
N_{1,1}(u)
$$

只在：

$$
[1,3)
$$

非零。

也就是说：

$$
\boxed{
N_{1,1}(u)=0
\qquad
u\notin[1,3)
}
$$

这和 Bézier 非常不同。

对于 Bézier，一个 Bernstein basis：

$$
B_i^n(t)
$$

通常在整个

$$
0<t<1
$$

都不为零。

所以一个控制点影响整条 Bézier。

但 B-Spline 的 basis 只活在一个局部区间。

一般地：

$$
\boxed{
N_{i,p}(u)\neq0
\text{ 的区间最多是 }
[u_i,u_{i+p+1})
}
$$

这叫：

$$
\boxed{\text{local support}}
$$

局部支撑。

---

# 16. 这直接导致局部控制

B-Spline 曲线是：

$$
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i.
$$

假设修改：

$$
\mathbf P_i
\rightarrow
\mathbf P_i+\Delta\mathbf P_i.
$$

那么曲线变化：

$$
\Delta\mathbf C(u)
=

N_{i,p}(u)\Delta\mathbf P_i.
$$

而当

$$
u\notin[u_i,u_{i+p+1})
$$

时：

$$
N_{i,p}(u)=0.
$$

于是：

$$
\boxed{
\Delta\mathbf C(u)=0
}
$$

也就是说：

> 修改 $\mathbf P_i$，只影响有限的一段参数区间。

这就是 B-Spline 相比单段 Bézier 最大的优势之一。

---

# 17. 一次 B-Spline 曲线其实就是折线

我们再具体一点。

设：

$$
p=1.
$$

控制点为：

$$
\mathbf P_0,\mathbf P_1,\mathbf P_2,\mathbf P_3.
$$

一次 B-Spline 的 basis 是一组“三角帽子”。

于是曲线在某个 knot span 里面通常只有两个 basis 非零。

比如某个区间里：

$$
N_{i,1}(u)+N_{i+1,1}(u)=1.
$$

于是：

$$
\mathbf C(u)
=

N_{i,1}(u)\mathbf P_i
+
N_{i+1,1}(u)\mathbf P_{i+1}.
$$

这就是两个点之间的 linear interpolation。

所以：

$$
\boxed{
1\text{ 次 B-Spline}
=

\text{一系列首尾连接的线段}
}
$$

也就是控制多边形本身。

---

# 18. 现在升到二次 B-Spline

令：

$$
p=2.
$$

根据 Cox–de Boor：

$$
N_{i,2}(u)
=

\frac{u-u_i}{u_{i+2}-u_i}
N_{i,1}(u)
+
\frac{u_{i+3}-u}{u_{i+3}-u_{i+1}}
N_{i+1,1}(u).
$$

注意它是：

$$
\boxed{
\text{两个一次 basis 的线性加权组合}
}
$$

而一次 basis 又来自：

$$
\boxed{
\text{两个 0 次 basis 的线性加权组合}
}
$$

所以结构是：

```text
degree 0:  方块
             ↓
degree 1:  三角帽
             ↓
degree 2:  平滑凸包
             ↓
degree 3:  更平滑
```

这是理解 Cox–de Boor 最重要的直觉。

---

# 19. 一个完整的二次 basis 例子

还是采用均匀 knot：

$$
u_i=i.
$$

我们计算：

$$
N_{0,2}(u).
$$

由于支撑区间为：

$$
[u_0,u_3)
=

[0,3),
$$

所以它只在：

$$
0\leq u<3
$$

非零。

我们逐段推。

---

## 在 $0\leq u<1$

先算一次 basis。

有：

$$
N_{0,1}(u)=u
$$

以及：

$$
N_{1,1}(u)=0.
$$

因此：

$$
N_{0,2}(u)
=

\frac{u}{2}N_{0,1}(u)
+
\frac{3-u}{2}N_{1,1}(u).
$$

代入：

$$
N_{0,2}(u)
=

\frac{u}{2}\cdot u.
$$

所以：

$$
\boxed{
N_{0,2}(u)
=

\frac{u^2}{2}
}
$$

在

$$
0\leq u<1.
$$

---

## 在 $1\leq u<2$

这一段：

$$
N_{0,1}(u)=2-u,
$$

而

$$
N_{1,1}(u)=u-1.
$$

所以：

$$
N_{0,2}(u)
=

\frac{u}{2}(2-u)
+
\frac{3-u}{2}(u-1).
$$

逐步展开第一项：

$$
\frac{u}{2}(2-u)
=

u-\frac{u^2}{2}.
$$

第二项：

$$
\frac{3-u}{2}(u-1)
=

\frac{-u^2+4u-3}{2}.
$$

相加：

$$
N_{0,2}(u)
=

u-\frac{u^2}{2}
+
\frac{-u^2+4u-3}{2}.
$$

把第一部分写成共同分母：

$$
u-\frac{u^2}{2}
=

\frac{2u-u^2}{2}.
$$

所以：

$$
N_{0,2}(u)
=

\frac{2u-u^2-u^2+4u-3}{2}.
$$

整理：

$$
\boxed{
N_{0,2}(u)
=

\frac{-2u^2+6u-3}{2}
}
$$

---

## 在 $2\leq u<3$

这时候：

$$
N_{0,1}(u)=0,
$$

而：

$$
N_{1,1}(u)=3-u.
$$

因此：

$$
N_{0,2}(u)
=

\frac{3-u}{2}(3-u).
$$

所以：

$$
\boxed{
N_{0,2}(u)
=

\frac{(3-u)^2}{2}
}
$$

---

# 20. 二次 basis 已经是“圆滑小山包”

因此：

$$
N_{0,2}(u)
=

\begin{cases}
\dfrac{u^2}{2}, & 0\leq u<1,\\[6pt]
\dfrac{-2u^2+6u-3}{2}, & 1\leq u<2,\\[6pt]
\dfrac{(3-u)^2}{2}, & 2\leq u<3,\\[6pt]
0,&\text{其他}.
\end{cases}
$$

它大概长这样：

```text
            __
          /    \
        /        \
______ /          \ ______
     0   1   2    3
```

注意两个特点。

第一，它不是一个全局多项式，而是：

$$
\boxed{\text{piecewise polynomial}}
$$

第二，它只在三个 knot span 上非零：

$$
[0,1),[1,2),[2,3).
$$

因为：

$$
p=2
$$

时，每个 basis 最多覆盖：

$$
p+1=3
$$

个 knot span。

---

# 21. 一般规律现在出现了

对于 $p$ 次 B-Spline basis：

$$
N_{i,p}(u),
$$

它的 support 是：

$$
\boxed{
[u_i,u_{i+p+1})
}
$$

因此最多跨过：

$$
\boxed{p+1}
$$

个 knot span。

例如：

$$
p=1
$$

覆盖 $2$ 个 span；

$$
p=2
$$

覆盖 $3$ 个 span；

$$
p=3
$$

覆盖 $4$ 个 span。

所以对于 cubic B-Spline：

$$
\boxed{
\text{某一个参数 }u
\text{ 附近，最多只有 }4\text{ 个控制点起作用}
}
$$

这件事情极其重要。

---

# 22. 和 Bézier 做一个鲜明对比

假设有：

$$
100
$$

个控制点。

如果做成一个 $99$ 次 Bézier：

$$
\mathbf C(t)
=

\sum_{i=0}^{99}
B_i^{99}(t)\mathbf P_i.
$$

对于一般的

$$
0<t<1,
$$

几乎：

$$
100
$$

个控制点都会参与当前点的计算。

但是如果使用 cubic B-Spline：

$$
p=3,
$$

那么在一个普通 knot span 内：

$$
\boxed{
通常只有 4 个 basis 非零
}
$$

因此当前点只受附近：

$$
4
$$

个控制点影响。

即使总共有：

$$
10000
$$

个控制点，这个性质也不会改变。

这就是：

$$
\boxed{\text{locality}}
$$

---

# 23. 现在看看 knot 到底控制什么

我们已经知道 B-Spline basis 是通过：

$$
U=\{u_0,\ldots,u_m\}
$$

定义的。

所以 knot 的作用可以先粗略理解成：

$$
\boxed{
\text{决定各个 basis 在参数轴上的位置和支撑范围}
}
$$

例如：

$$
U=
\{0,1,2,3,4,5\}
$$

是 uniform knot。

相邻间距都是：

$$
1.
$$

而：

$$
U=
\{0,0.5,1,2.7,4,8\}
$$

则是 non-uniform。

不同 knot 间距会改变 basis 的形状和参数化。

这就是为什么 B-Spline 有：

$$
\boxed{
\text{uniform B-Spline}
}
$$

和：

$$
\boxed{
\text{non-uniform B-Spline}
}
$$

之分。

---

# 24. 控制点数量、次数、knot 数量之间的关系

这里把符号正式统一一下。

设：

$$
n+1
$$

个控制点：

$$
\mathbf P_0,\ldots,\mathbf P_n.
$$

曲线次数为：

$$
p.
$$

knot vector 为：

$$
U=
\{u_0,\ldots,u_m\}.
$$

那么标准关系是：

$$
\boxed{
m=n+p+1
}
$$

因为下标从 $0$ 开始，所以 knot 总数量是：

$$
m+1=n+p+2.
$$

例如：

$$
n=5
$$

代表有：

$$
6
$$

个控制点。

如果：

$$
p=2,
$$

那么：

$$
m=5+2+1=8.
$$

所以 knot vector 有：

$$
m+1=9
$$

个 knot。

---

# 25. 实际 CAD 中经常见到这样的 knot vector

例如我们有 $6$ 个控制点：

$$
\mathbf P_0,\ldots,\mathbf P_5,
$$

使用：

$$
p=2.
$$

可以采用：

$$
\boxed{
U=
\{0,0,0,1,2,3,4,4,4\}
}
$$

检查一下：

控制点数量：

$$
n+1=6
$$

所以：

$$
n=5.
$$

次数：

$$
p=2.
$$

因此：

$$
m=n+p+1=8.
$$

knot 下标确实是：

$$
u_0,\ldots,u_8,
$$

总共 $9$ 个。

这里开头有：

$$
0,0,0
$$

结尾有：

$$
4,4,4.
$$

也就是端点重复：

$$
p+1=3
$$

次。

这样的 B-Spline 通常叫：

$$
\boxed{\text{clamped B-Spline}}
$$

或者：

$$
\boxed{\text{open B-Spline}}
$$

---

# 26. 为什么端点 knot 要重复 $p+1$ 次？

这是一个非常实用的设计。

普通 B-Spline 一般并不一定经过控制点。

就像 Bézier 的中间控制点一样。

但是 CAD 建模时，我们经常希望：

$$
\boxed{
\text{曲线经过第一个和最后一个控制点}
}
$$

即：

$$
\mathbf C(u_{\text{start}})
=

\mathbf P_0,
$$

$$
\mathbf C(u_{\text{end}})
=

\mathbf P_n.
$$

把端 knot 重复：

$$
p+1
$$

次，就可以做到这一点。

因此 clamped B-Spline 的行为很像 Bézier：

```text
P0 --------------------------- Pn
^                               ^
曲线从这里开始                  曲线到这里结束
```

---

# 27. 一个典型 cubic B-Spline

假设：

$$
p=3.
$$

有 $7$ 个控制点：

$$
\mathbf P_0,\ldots,\mathbf P_6.
$$

于是：

$$
n=6.
$$

所以：

$$
m=n+p+1
=

6+3+1
=
 1.

$$

因此共有：

$$
11
$$

个 knot。

一个典型 clamped knot vector 可以是：

$$
\boxed{
U=
\{0,0,0,0,\;1,2,3,\;4,4,4,4\}
}
$$

你会看到开头：

$$
4
$$

个 $0$，

结尾：

$$
4
$$

个 $4$。

因为：

$$
p+1=4.
$$

内部 knot 是：

$$
1,2,3.
$$

于是有效参数区间是：

$$
\boxed{
u\in[0,4]
}
$$

曲线被分成：

$$
[0,1],\quad
[1,2],\quad
[2,3],\quad
[3,4].
$$

每一段都是：

$$
\boxed{\text{cubic polynomial}}
$$

但它们自动光滑连接起来。

---

# 28. 这就是“spline”真正的意思

Spline 最早来自机械制图。

以前画船体、飞机外形时，会用一条有弹性的细木条或金属条：

> 让它经过或靠近若干支撑点，然后自然弯曲。

那种细木条本身就叫：

$$
\text{spline}.
$$

数学上的 spline 继承了这个思想：

$$
\boxed{
\text{很多简单的低次多项式段，
以光滑方式拼接起来}
}
$$

而 B-Spline 的：

$$
B
$$

是：

$$
\boxed{\text{Basis}}
$$

所以：

$$
\boxed{
\text{B-Spline}
=

\text{Basis Spline}
}
$$

它不是 “Bezier Spline”。

这一点经常有人误会。

---

# 29. knot multiplicity：重复 knot 会发生什么？

这是 B-Spline 最漂亮的地方之一。

假设曲线次数为：

$$
p.
$$

某个内部 knot：

$$
u_k
$$

重复了：

$$
r
$$

次。

那么一般情况下，曲线在这个 knot 处的连续性为：

$$
\boxed{
C^{p-r}
}
$$

这里假设内部 knot multiplicity 不超过 $p+1$。

例如 cubic：

$$
p=3.
$$

如果 knot 只出现一次：

$$
r=1,
$$

那么：

$$
C^{3-1}
=

C^2.
$$

即：

$$
\boxed{C^2}
$$

连续。

所以普通 cubic B-Spline 非常光滑。

---

# 30. cubic 的 knot 重复两次

如果：

$$
p=3,
\qquad
r=2,
$$

那么：

$$
C^{3-2}
=

C^1.
$$

意味着：

$$
\boxed{
\text{位置和一阶导连续，
但二阶导可能不连续}
}
$$

视觉上仍然没有尖角，但曲率可能突然变化。

---

# 31. cubic 的 knot 重复三次

如果：

$$
r=3,
$$

那么：

$$
C^{3-3}
=

C^0.
$$

只保证：

$$
\boxed{\text{位置连续}}
$$

所以可能形成尖角。

这在 CAD 中非常有用。

也就是说：

> 我不需要换一种曲线，只要改变 knot multiplicity，就能控制曲线连接处到底有多平滑。

---

# 32. 如果内部 knot 重复 $p+1$ 次呢？

例如 cubic：

$$
p=3
$$

重复：

$$
4
$$

次。

那么这实际上会把参数域彻底切断。

左右两边可以独立。

因此：

$$
\boxed{
p+1\text{ 重 knot 可以把 spline 分割开}
}
$$

而 Bézier 的端点正是这种极端情况。

---

# 33. 现在终于可以理解：Bézier 为什么是特殊 B-Spline

假设我们有一个三次 Bézier。

控制点：

$$
\mathbf P_0,\mathbf P_1,\mathbf P_2,\mathbf P_3.
$$

次数：

$$
p=3.
$$

如果把它表示成 B-Spline，取 knot vector：

$$
\boxed{
U=
\{0,0,0,0,1,1,1,1\}
}
$$

开头有：

$$
p+1=4
$$

个 $0$，

结尾有：

$$
p+1=4
$$

个 $1$。

中间：

$$
\boxed{\text{没有内部 knot}}
$$

因此整个参数域只有一个 polynomial span：

$$
[0,1].
$$

这时 B-Spline basis 恰好变成 Bernstein basis：

$$
N_{0,3}(u)=(1-u)^3,
$$

$$
N_{1,3}(u)=3u(1-u)^2,
$$

$$
N_{2,3}(u)=3u^2(1-u),
$$

$$
N_{3,3}(u)=u^3.
$$

于是：

$$
\mathbf C(u)
=

\sum_{i=0}^{3}
N_{i,3}(u)\mathbf P_i
$$

就变成：

$$
\mathbf C(u)
=

(1-u)^3\mathbf P_0
+
3u(1-u)^2\mathbf P_1
+
3u^2(1-u)\mathbf P_2
+
u^3\mathbf P_3.
$$

这不就是 cubic Bézier 吗？

所以：

$$
\boxed{
\text{Bézier 是只有一个 polynomial span 的 clamped B-Spline}
}
$$

这个理解比单纯记：

$$
\text{Bézier}\subset\text{B-Spline}
$$

要深得多。

---

# 34. 现在再看 B-Spline，你可以把它理解成什么？

一个典型 cubic B-Spline：

```text
control points:

P0   P1   P2   P3   P4   P5   P6
 ●----●----●----●----●----●----●

knot spans:

   span 0
      ↓
   [0,1]

        span 1
           ↓
         [1,2]

             span 2
                ↓
              [2,3]

                  span 3
                     ↓
                   [3,4]
```

每一个 span：

$$
[u_k,u_{k+1}]
$$

里面，曲线就是一个：

$$
p\text{ 次多项式}.
$$

对于 cubic：

$$
p=3.
$$

所以每个 span 都是 cubic polynomial。

而 knot 保证这些 cubic polynomial：

$$
\boxed{\text{以一定连续性拼起来}}
$$

basis 则保证：

$$
\boxed{\text{每个控制点只有局部影响}}
$$

这两个东西合在一起，就是 B-Spline 的核心。

---

# 35. B-Spline 也具有 partition of unity

和 Bernstein basis 一样，B-Spline basis 也满足：

$$
\boxed{
\sum_iN_{i,p}(u)=1
}
$$

在有效参数域内成立。

而且通常：

$$
N_{i,p}(u)\geq0.
$$

因此：

$$
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i
$$

也是控制点的凸组合。

所以 B-Spline 同样具有很好的几何稳定性。

更准确一点，因为只有局部 basis 非零，因此某个 knot span 上的曲线点位于：

$$
\boxed{
\text{当前活跃控制点的 convex hull}
}
$$

里面。

这比 Bézier 的全局 convex hull 性质还更“局部”。

---

# 36. 现在解释一句经常看到的话

你以后经常会看到：

> “A degree-$p$ B-spline curve is locally controlled by $p+1$ control points.”

它的意思并不是：

> 整条曲线只有 $p+1$ 个控制点。

恰恰相反。

整条曲线可以有：

$$
1000
$$

甚至：

$$
100000
$$

个控制点。

但对于某个普通参数位置 $u$，只有：

$$
\boxed{p+1}
$$

个 basis 非零。

所以 cubic B-Spline：

$$
p=3
$$

在一个普通 span 中只需要：

$$
\boxed{4}
$$

个控制点。

这也是它为什么非常适合 CAD 和几何内核。

---

# 37. 和 Bézier 做最终对照

现在这两个东西的区别已经可以非常准确地描述。

|                | Bézier           | B-Spline             |
| -------------- | ---------------- | -------------------- |
| 数学形式       | $\sum B_i^pP_i$  | $\sum N_{i,p}P_i$    |
| 基函数         | Bernstein        | B-Spline basis       |
| 控制点数       | 固定为 $p+1$     | 可以远大于 $p+1$     |
| 是否分段       | 单段 polynomial  | piecewise polynomial |
| 修改一个控制点 | 通常影响整条曲线 | 只影响局部           |
| knot vector    | 隐含的特殊形式   | 显式存在             |
| 控制连续性     | 多段时手动处理   | knot 自动管理        |
| 常用次数       | cubic            | cubic 很常见         |

但最值得记住的不是这个表。

而是这一句话：

$$
\boxed{
\text{B-Spline =
用局部支撑的 basis，
把很多低次 polynomial span
光滑地组织成一条大曲线}
}
$$

---

# 38. 我认为你现在应该形成的完整心智模型

Bézier 是：

$$
\boxed{
\text{一组控制点}
+
\text{一组 Bernstein basis}
}
$$

得到：

$$
\boxed{\text{一段 polynomial curve}}
$$

B-Spline 则加入：

$$
\boxed{\text{knot vector}}
$$

用 knot 把参数轴切成：

$$
\boxed{\text{很多 span}}
$$

然后 B-Spline basis：

$$
N_{i,p}(u)
$$

只在少数 span 上非零。

于是：

$$
\boxed{
\text{很多低次 polynomial 段}
+
\text{自动的平滑连接}
+
\text{局部控制}
}
$$

这就是 B-Spline。

如果压缩成一张图：

```text
Bézier

P0 P1 P2 P3
 \  |  |  /
  \ |  | /
   一整段 cubic
   所有控制点共同作用


B-Spline

P0 P1 P2 P3 P4 P5 P6 P7 ...
       ↓ ↓ ↓ ↓
       当前只有附近几个点作用

u:
0------1------2------3------4------5
   span   span   span   span

每个 span 都是低次 polynomial
相邻 span 自动平滑连接
```

所以从 Bézier 到 B-Spline，真正发生的思想升级是：

$$
\boxed{
\text{global polynomial}
\quad\longrightarrow\quad
\text{local piecewise polynomial}
}
$$

而 **knot vector 就是这次升级的核心机制**。

下一层最值得继续的是 **Cox–de Boor 公式为什么恰好长成那个样子**，以及 **给定一个 cubic B-Spline、一个具体 $u$，到底是哪 4 个控制点参与、权重分别是多少**。把这个手算一遍之后，B-Spline 就会从“公式”彻底变成一个可以自己实现的数据结构和算法。
