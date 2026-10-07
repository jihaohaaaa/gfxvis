$$
\boxed{\text{先讲“为什么需要它”}\rightarrow\text{再讲公式}\rightarrow\text{再讲几何直觉}\rightarrow\text{再做具体例子}}
$$

先把结论放在最前面：

$$
\boxed{
\text{NURBS}
=

\text{B-Spline}
+
\text{每个控制点一个 weight}
+
\text{有理化}
}
$$

也可以写成：

$$
\boxed{
\text{B-Spline}
\subset
\text{NURBS}
}
$$

而这个看似只是“多了一个 $w_i$”的变化，能力提升其实非常大。

---

# 1. 先回忆 B-Spline 已经解决了什么

上一章里，我们有 B-Spline：

$$
\boxed{
\mathbf C(u)
=

\sum_{i=0}^{n}
N_{i,p}(u)\mathbf P_i
}
$$

先声明符号：

- $\mathbf P_i$：第 $i$ 个控制点
- $n+1$：控制点总数
- $p$：曲线次数
- $u$：参数
- $N_{i,p}(u)$：B-Spline 基函数
- $U=\{u_0,\dots,u_m\}$：knot vector

B-Spline 已经解决了 Bézier 的两个大问题：

$$
\boxed{\text{可以有很多控制点，但次数保持较低}}
$$

以及：

$$
\boxed{\text{局部控制}}
$$

例如 cubic B-Spline：

$$
p=3
$$

无论总共有多少控制点，在普通 knot span 内，一般只有：

$$
p+1=4
$$

个控制点真正参与当前点的计算。

所以 B-Spline 已经非常强了。

那么为什么还需要 NURBS？

---

# 2. B-Spline 还缺什么？

问题出在一个非常经典的几何对象：

$$
\boxed{\text{圆}}
$$

假设我们希望精确表示一个圆。

你可能直觉上觉得：

> B-Spline 已经这么强了，当然应该能表示圆吧？

实际上：

$$
\boxed{
\text{普通 polynomial B-Spline 不能精确表示圆}
}
$$

它可以：

$$
\text{非常非常接近圆}
$$

但不能：

$$
\text{数学上完全等于圆}.
$$

这在计算机图形学里可能没那么严重。

但在 CAD 里，这是一个大问题。

---

# 3. 为什么 CAD 特别在意“精确圆”？

机械建模里到处都是：

- 圆
- 圆弧
- 圆柱
- 圆锥
- 球
- 圆环

例如一个圆柱面：

$$
x^2+y^2=r^2.
$$

如果你用 polynomial B-Spline 只能逼近圆，那么理论上这个“圆柱”就不是严格圆柱。

对于渲染，这通常没有问题。

对于精确几何计算，例如：

- surface-surface intersection
- edge-face intersection
- offset
- Boolean operation
- tangency
- curvature
- manufacturing

就可能变得麻烦。

CAD 想要的是：

$$
\boxed{
\text{同一套曲线表示方法既能表示自由曲线，又能精确表示圆锥曲线}
}
$$

于是自然就引出了：

$$
\boxed{\text{NURBS}}
$$

---

# 4. NURBS 到底是什么缩写？

NURBS：

$$
\boxed{
\text{Non-Uniform Rational B-Spline}
}
$$

拆开：

$$
\text{Non-Uniform}
+
\text{Rational}
+
\text{B-Spline}.
$$

其中最关键的新词其实是：

$$
\boxed{\text{Rational}}
$$

也就是：

$$
\boxed{\text{有理}}
$$

“Non-Uniform”我们上一章其实已经接触过，因为 knot vector 本来就不一定均匀。

所以从普通 B-Spline 到 NURBS，最本质的升级就是：

$$
\boxed{
\text{polynomial}
\longrightarrow
\text{rational}
}
$$

---

# 5. 什么叫 rational？

数学里：

$$
\boxed{
\text{rational function}
=

\frac{\text{polynomial}}{\text{polynomial}}
}
$$

例如：

$$
f(u)
=

\frac{u^2+1}{u+2}.
$$

这就是一个 rational function。

普通 B-Spline：

$$
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i
$$

本质上是 piecewise polynomial。

NURBS 则变成：

$$
\boxed{
\mathbf C(u)
=

\frac{
\sum_iN_{i,p}(u)w_i\mathbf P_i
}{
\sum_iN_{i,p}(u)w_i
}
}
$$

看到了吗？

突然出现了一个：

$$
\boxed{\text{分母}}
$$

这就是 rational 的来源。

---

# 6. NURBS 比 B-Spline 多了什么数据？

先声明：

普通 B-Spline 有：

$$
\mathbf P_0,\dots,\mathbf P_n
$$

以及 knot vector：

$$
U=\{u_0,\dots,u_m\}.
$$

NURBS 给每个控制点：

$$
\mathbf P_i
$$

再附加一个数：

$$
\boxed{w_i}
$$

叫：

$$
\boxed{\text{weight}}
$$

即权重。

所以：

```text
B-Spline control point:

P0
P1
P2
P3


NURBS control point:

(P0, w0)
(P1, w1)
(P2, w2)
(P3, w3)
```

也就是说：

$$
\boxed{
\mathbf P_i
\quad\longrightarrow\quad
(\mathbf P_i,w_i)
}
$$

---

# 7. 为什么不能直接写成 $w_iN_iP_i$？

你可能最自然地想到：

$$
\mathbf C(u)
=

\sum_i
w_iN_{i,p}(u)\mathbf P_i.
$$

但这样有一个问题。

原本 B-Spline basis 满足：

$$
\sum_iN_{i,p}(u)=1.
$$

所以：

$$
\mathbf C(u)
$$

是控制点的加权平均。

但乘上 $w_i$ 以后：

$$
\sum_iw_iN_{i,p}(u)
$$

通常不再等于 $1$。

于是整体会产生额外的缩放。

所以必须做一次归一化。

即：

$$
\boxed{
\mathbf C(u)
=

\frac{
\sum_iN_{i,p}(u)w_i\mathbf P_i
}{
\sum_iN_{i,p}(u)w_i
}
}
$$

分母的作用就是：

$$
\boxed{\text{normalize}}
$$

---

# 8. 换一种写法：NURBS basis

我们定义新的 basis：

$$
\boxed{
R_{i,p}(u)
=

\frac{
w_iN_{i,p}(u)
}{
\sum_{j=0}^{n}
w_jN_{j,p}(u)
}
}
$$

那么 NURBS 就重新变回非常熟悉的形式：

$$
\boxed{
\mathbf C(u)
=

\sum_{i=0}^{n}
R_{i,p}(u)\mathbf P_i
}
$$

现在结构和前面完全一致了。

Bézier：

$$
\mathbf C(t)
=

\sum_iB_i^p(t)\mathbf P_i
$$

B-Spline：

$$
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i
$$

NURBS：

$$
\boxed{
\mathbf C(u)
=

\sum_iR_{i,p}(u)\mathbf P_i
}
$$

所以它们始终没有离开一个基本框架：

$$
\boxed{
\text{曲线}
=

\sum
\text{basis}
\times
\text{control point}
}
$$

---

# 9. NURBS basis 仍然加起来等于 1

我们验证一下。

定义：

$$
R_{i,p}(u)
=

\frac{
w_iN_{i,p}(u)
}{
\sum_jw_jN_{j,p}(u)
}.
$$

那么：

$$
\sum_iR_{i,p}(u)
=

\sum_i
\frac{
w_iN_{i,p}(u)
}{
\sum_jw_jN_{j,p}(u)
}.
$$

因为分母与 $i$ 无关，所以：

$$
=

\frac{
\sum_iw_iN_{i,p}(u)
}{
\sum_jw_jN_{j,p}(u)
}.
$$

分子分母其实就是同一个量。

因此：

$$
\boxed{
\sum_iR_{i,p}(u)=1
}
$$

所以 NURBS basis 仍然具有：

$$
\boxed{\text{partition of unity}}
$$

---

# 10. weight 的直觉是什么？

先不要管圆。

我们做一个最简单的例子。

假设三个控制点：

$$
\mathbf P_0,\mathbf P_1,\mathbf P_2.
$$

先假设某个参数 $u$ 下，普通 B-Spline basis 恰好为：

$$
N_0=0.25,
$$

$$
N_1=0.5,
$$

$$
N_2=0.25.
$$

如果所有权重：

$$
w_0=w_1=w_2=1,
$$

那么：

$$
R_0=0.25,
$$

$$
R_1=0.5,
$$

$$
R_2=0.25.
$$

于是：

$$
\mathbf C
=

0.25\mathbf P_0
+
0.5\mathbf P_1
+
0.25\mathbf P_2.
$$

和普通 B-Spline 完全一样。

---

# 11. 把中间控制点权重调大

现在设：

$$
w_0=1,
\qquad
w_1=2,
\qquad
w_2=1.
$$

原始 weighted basis 是：

$$
w_0N_0=0.25,
$$

$$
w_1N_1=1,
$$

$$
w_2N_2=0.25.
$$

总和：

$$
0.25+1+0.25=1.5.
$$

所以归一化后：

$$
R_0
=

\frac{0.25}{1.5}
=

\frac16,
$$

$$
R_1
=

\frac{1}{1.5}
=

\frac23,
$$

$$
R_2
=

\frac{0.25}{1.5}
=

\frac16.
$$

于是：

$$
\boxed{
\mathbf C
=

\frac16\mathbf P_0
+
\frac23\mathbf P_1
+
\frac16\mathbf P_2
}
$$

中间控制点原来贡献：

$$
50\%
$$

现在变成：

$$
66.7\%.
$$

所以：

$$
\boxed{
w_i\text{ 越大，曲线通常越被 }\mathbf P_i\text{ 拉近}
}
$$

---

# 12. weight 就像控制点的“引力”

可以建立一个非常实用的直觉：

$$
\boxed{
w_i
=

\text{控制点 }\mathbf P_i\text{ 的影响强度}
}
$$

例如：

```text
                    P1
                    ●
                    ↑
              weight 很大

P0 ● ---------------------------- ● P2

曲线会明显被 P1 拉过去
```

如果：

$$
w_1
$$

越来越大，那么曲线越来越靠近：

$$
\mathbf P_1.
$$

---

# 13. weight 变小会怎样？

反过来，如果：

$$
w_1<1,
$$

那么 $\mathbf P_1$ 的影响减弱。

例如：

$$
w_0=1,
\qquad
w_1=0.2,
\qquad
w_2=1.
$$

还是假设：

$$
N_0=0.25,\quad
N_1=0.5,\quad
N_2=0.25.
$$

那么：

$$
w_0N_0=0.25,
$$

$$
w_1N_1=0.1,
$$

$$
w_2N_2=0.25.
$$

总和：

$$
0.6.
$$

所以：

$$
R_1
=

\frac{0.1}{0.6}
=

\frac16.
$$

原本：

$$
R_1=0.5
$$

现在只剩：

$$
R_1\approx0.167.
$$

于是曲线远离：

$$
\mathbf P_1.
$$

---

# 14. 如果所有 weight 一样，会发生什么？

这是理解 NURBS 与 B-Spline 包含关系的关键。

假设：

$$
w_0=w_1=\cdots=w_n=w.
$$

NURBS：

$$
\mathbf C(u)
=

\frac{
\sum_iN_{i,p}(u)w\mathbf P_i
}{
\sum_iN_{i,p}(u)w
}.
$$

上下同时提出 $w$：

$$
=

\frac{
w\sum_iN_{i,p}(u)\mathbf P_i
}{
w\sum_iN_{i,p}(u)
}.
$$

约去 $w$：

$$
=

\frac{
\sum_iN_{i,p}(u)\mathbf P_i
}{
\sum_iN_{i,p}(u)
}.
$$

而 B-Spline basis 满足：

$$
\sum_iN_{i,p}(u)=1.
$$

所以：

$$
\boxed{
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i
}
$$

也就是普通 B-Spline。

因此：

$$
\boxed{
w_0=w_1=\cdots=w_n
\Longrightarrow
\text{NURBS退化成B-Spline}
}
$$

特别是一般直接取：

$$
\boxed{w_i=1}
$$

---

# 15. 所以 B-Spline 是 NURBS 的特殊情况

现在关系就非常清楚了：

$$
\boxed{
\text{B-Spline}
=

\text{所有 weight 相等的 NURBS}
}
$$

因此：

$$
\boxed{
\text{B-Spline}
\subset
\text{NURBS}
}
$$

同理，因为 Bézier 是特殊 B-Spline：

$$
\boxed{
\text{Bézier}
\subset
\text{B-Spline}
\subset
\text{NURBS}
}
$$

---

# 16. 但还有一种重要东西：Rational Bézier

如果我们取 NURBS 的 knot vector 为：

$$
U=
\{
\underbrace{0,\ldots,0}_{p+1},
\underbrace{1,\ldots,1}_{p+1}
\},
$$

也就是只有一个 span，

但允许：

$$
w_i
$$

不相等，

那么得到的不是普通 Bézier，而是：

$$
\boxed{\text{Rational Bézier}}
$$

公式为：

$$
\boxed{
\mathbf C(t)
=

\frac{
\sum_{i=0}^{p}
B_i^p(t)w_i\mathbf P_i
}{
\sum_{i=0}^{p}
B_i^p(t)w_i
}
}
$$

因此：

$$
\boxed{
\text{Rational Bézier}
\subset
\text{NURBS}
}
$$

而普通 Bézier 则进一步要求：

$$
w_i=1.
$$

---

# 17. 为什么 rational suddenly 能表示圆？

这是 NURBS 最重要、也最漂亮的一部分。

普通 polynomial curve 的坐标，例如：

$$
x(u),y(u),
$$

都是 polynomial。

而圆满足：

$$
x^2+y^2=r^2.
$$

我们熟悉的参数化是：

$$
x(\theta)=r\cos\theta,
$$

$$
y(\theta)=r\sin\theta.
$$

但：

$$
\cos\theta,\sin\theta
$$

不是 polynomial。

所以你不能简单靠有限次数 polynomial 精确得到整段圆弧。

但存在一个经典的 rational 参数化。

---

# 18. 单位圆的 rational 参数化

先声明单位圆：

$$
x^2+y^2=1.
$$

可以采用参数 $t$，定义：

$$
\boxed{
x(t)
=

\frac{1-t^2}{1+t^2}
}
$$

$$
\boxed{
y(t)
=

\frac{2t}{1+t^2}
}
$$

验证它确实在圆上。

计算：

$$
x^2+y^2
=

\left(
\frac{1-t^2}{1+t^2}
\right)^2
+
\left(
\frac{2t}{1+t^2}
\right)^2.
$$

统一分母：

$$
=

\frac{
(1-t^2)^2+4t^2
}{
(1+t^2)^2
}.
$$

展开分子：

$$
(1-t^2)^2+4t^2
=

1-2t^2+t^4+4t^2.
$$

所以：

$$
=

1+2t^2+t^4.
$$

注意：

$$
1+2t^2+t^4
=

(1+t^2)^2.
$$

因此：

$$
x^2+y^2
=

\frac{(1+t^2)^2}{(1+t^2)^2}
=

1.

$$

所以：

$$
\boxed{x^2+y^2=1}
$$

严格成立。

这说明：

$$
\boxed{
\text{圆可以被 rational function 精确参数化}
}
$$

这就是 NURBS 能精确表示圆的根本原因。

---

# 19. 一个经典例子：用 Rational Quadratic Bézier 表示四分之一圆

这个例子极其重要。

我们要表示单位圆第一象限的四分之一圆弧：

$$
(1,0)
\rightarrow
(0,1).
$$

选三个控制点：

$$
\mathbf P_0=(1,0),
$$

$$
\mathbf P_1=(1,1),
$$

$$
\mathbf P_2=(0,1).
$$

注意：

$$
\mathbf P_1=(1,1)
$$

不在圆上。

权重取：

$$
w_0=1,
$$

$$
\boxed{
w_1=\frac{1}{\sqrt2}
}
$$

$$
w_2=1.
$$

那么这个 rational quadratic Bézier 就精确是一段：

$$
\boxed{90^\circ\text{ 圆弧}}
$$

---

# 20. 把公式写出来

二次 Bernstein basis 为：

$$
B_0^2(t)=(1-t)^2,
$$

$$
B_1^2(t)=2t(1-t),
$$

$$
B_2^2(t)=t^2.
$$

Rational Bézier：

$$
\mathbf C(t)
=

\frac{
B_0^2w_0\mathbf P_0+
B_1^2w_1\mathbf P_1+
B_2^2w_2\mathbf P_2
}{
B_0^2w_0+
B_1^2w_1+
B_2^2w_2
}.
$$

代入权重：

$$
\boxed{
\mathbf C(t)
=

\frac{
(1-t)^2\mathbf P_0
+
\sqrt2\,t(1-t)\mathbf P_1
+
t^2\mathbf P_2
}{
(1-t)^2
+
\sqrt2\,t(1-t)
+
t^2
}
}
$$

因为：

$$
2\cdot\frac1{\sqrt2}
=

\sqrt2.
$$

这条曲线严格就是四分之一圆。

不是 approximate。

而是：

$$
\boxed{\text{exact}}
$$

---

# 21. 看看中点 $t=\frac12$

取：

$$
t=\frac12.
$$

三个 Bernstein basis：

$$
B_0=\frac14,
$$

$$
B_1=\frac12,
$$

$$
B_2=\frac14.
$$

weighted basis：

$$
B_0w_0
=

\frac14,
$$

$$
B_1w_1
=

\frac12\cdot\frac1{\sqrt2}
=

\frac1{2\sqrt2},
$$

$$
B_2w_2
=

\frac14.
$$

由于对称性，最终必然有：

$$
x=y.
$$

而单位圆第一象限 $45^\circ$ 点是：

$$
\boxed{
\left(
\frac1{\sqrt2},
\frac1{\sqrt2}
\right)
}
$$

这个 rational Bézier 正好经过它。

于是：

$$
t=\frac12
$$

正对应：

$$
45^\circ
$$

位置。

---

# 22. 为什么恰好是 $1/\sqrt2$？

这其实与：

$$
\cos45^\circ
=

\frac1{\sqrt2}
$$

直接相关。

更一般地，如果用 rational quadratic Bézier 表示圆心角为：

$$
2\theta
$$

的圆弧，

中间控制点的权重取：

$$
\boxed{
w=\cos\theta
}
$$

例如四分之一圆：

$$
2\theta=90^\circ
$$

所以：

$$
\theta=45^\circ.
$$

于是：

$$
w
=

\cos45^\circ
=

\frac1{\sqrt2}.
$$

这是 CAD 里非常经典的结果。

---

# 23. 现在讲 NURBS 最深的几何解释：齐次坐标

如果只把 weight 理解成：

> 拉力

这是一个不错的直觉。

但真正从数学上理解 NURBS，最好进入：

$$
\boxed{\text{homogeneous coordinates}}
$$

也就是齐次坐标。

这和你熟悉的图形学 projection matrix 是同一套思想。

---

# 24. 先回忆普通三维点的齐次坐标

三维点：

$$
\mathbf P=(x,y,z).
$$

可以写成齐次形式：

$$
\widetilde{\mathbf P}
=

(X,Y,Z,W).
$$

它代表的普通三维点是：

$$
\boxed{
\mathbf P
=

\left(
\frac XW,
\frac YW,
\frac ZW
\right)
}
$$

只要：

$$
W\neq0.
$$

例如：

$$
(2,4,6,2)
$$

代表：

$$
(1,2,3).
$$

而：

$$
(1,2,3,1)
$$

也代表：

$$
(1,2,3).
$$

因此：

$$
(1,2,3,1)
$$

和：

$$
(2,4,6,2)
$$

在 projective space 中对应同一个普通点。

---

# 25. 把 NURBS 控制点提升到高一维

对于普通三维控制点：

$$
\mathbf P_i=(x_i,y_i,z_i)
$$

以及权重：

$$
w_i,
$$

定义四维控制点：

$$
\boxed{
\widetilde{\mathbf P}_i
=

(w_ix_i,\,
w_iy_i,\,
w_iz_i,\,
w_i)
}
$$

注意不是：

$$
(x_i,y_i,z_i,w_i)
$$

而是：

$$
\boxed{
(w_ix_i,w_iy_i,w_iz_i,w_i)
}
$$

---

# 26. 然后在四维里做普通 B-Spline

定义：

$$
\widetilde{\mathbf C}(u)
=

\sum_i
N_{i,p}(u)
\widetilde{\mathbf P}_i.
$$

把：

$$
\widetilde{\mathbf P}_i
=

(w_i\mathbf P_i,w_i)
$$

代入：

$$
\widetilde{\mathbf C}(u)
=

\sum_i
N_{i,p}(u)
(w_i\mathbf P_i,w_i).
$$

于是：

$$
\widetilde{\mathbf C}(u)
=

\left(
\sum_iN_{i,p}(u)w_i\mathbf P_i,
\,
\sum_iN_{i,p}(u)w_i
\right).
$$

假设写成：

$$
\widetilde{\mathbf C}(u)
=

(\mathbf X(u),W(u)).
$$

那么：

$$
\mathbf X(u)
=

\sum_iN_{i,p}(u)w_i\mathbf P_i
$$

以及：

$$
W(u)
=

\sum_iN_{i,p}(u)w_i.
$$

---

# 27. 最后做 perspective divide

从齐次空间投影回普通空间：

$$
\mathbf C(u)
=

\frac{\mathbf X(u)}{W(u)}.
$$

因此：

$$
\boxed{
\mathbf C(u)
=

\frac{
\sum_iN_{i,p}(u)w_i\mathbf P_i
}{
\sum_iN_{i,p}(u)w_i
}
}
$$

这正好就是 NURBS 公式。

所以可以得到一个极其重要的理解：

$$
\boxed{
\text{NURBS}
=

\text{高一维空间中的普通 B-Spline}
+
\text{齐次除法}
}
$$

这比“B-Spline 加个权重”更接近它的数学本质。

---

# 28. 和 GPU perspective-correct interpolation 非常像

如果你做过 rasterizer，这个结构其实会非常眼熟。

光栅化里 perspective-correct interpolation 会出现：

$$
\frac{
\sum_i\lambda_i\frac{a_i}{w_i}
}{
\sum_i\lambda_i\frac1{w_i}
}
$$

这种：

$$
\boxed{
\frac{\text{weighted numerator}}
{\text{weighted denominator}}
}
$$

结构。

NURBS 也是：

$$
\boxed{
\frac{
\sum_iN_iw_iP_i
}{
\sum_iN_iw_i
}
}
$$

它们背后的共同数学机制都是：

$$
\boxed{\text{projective / homogeneous representation}}
$$

---

# 29. weight 为什么有几何意义，现在也清楚了

原来我们说：

$$
w_i\text{ 越大}
$$

曲线越靠近：

$$
\mathbf P_i.
$$

现在可以从齐次空间理解。

原控制点：

$$
\mathbf P_i=(x_i,y_i).
$$

提升到三维齐次空间：

$$
\widetilde{\mathbf P}_i
=

(w_ix_i,w_iy_i,w_i).
$$

改变：

$$
w_i
$$

其实是在高维 projective geometry 中改变这个控制点的位置。

然后：

$$
\text{B-Spline interpolation}
$$

再经过：

$$
\text{projective divide}.
$$

所以 weight 并不是一个随便加上的“经验参数”。

它来自严格的：

$$
\boxed{\text{projective geometry}}
$$

---

# 30. NURBS 是否还具有 local control？

有。

这是非常重要的一点。

NURBS basis：

$$
R_{i,p}(u)
=

\frac{
w_iN_{i,p}(u)
}{
\sum_jw_jN_{j,p}(u)
}.
$$

如果：

$$
N_{i,p}(u)=0,
$$

那么：

$$
R_{i,p}(u)=0.
$$

而 B-Spline basis 满足：

$$
N_{i,p}(u)=0
$$

当：

$$
u\notin[u_i,u_{i+p+1}).
$$

所以：

$$
\boxed{
R_{i,p}(u)=0
\qquad
u\notin[u_i,u_{i+p+1})
}
$$

因此 NURBS 仍然保留：

$$
\boxed{\text{local support}}
$$

和：

$$
\boxed{\text{local control}}
$$

这非常关键。

它不是为了 rational 能力而牺牲 B-Spline 的局部性。

---

# 31. cubic NURBS 仍然只需要局部控制点

例如：

$$
p=3.
$$

那么普通 knot span 中最多有：

$$
p+1=4
$$

个 B-Spline basis 非零。

因此 NURBS 也只有这些：

$$
4
$$

个 rational basis 非零。

所以即使有：

$$
10000
$$

个 NURBS 控制点，

评估某个普通参数位置 $u$ 时，仍然只涉及局部的：

$$
4
$$

个控制点及其 weight。

---

# 32. knot 在 NURBS 中还存在吗？

当然存在。

实际上 NURBS 的 B-Spline 部分完全保留下来了。

仍然有：

- degree $p$
- control points $\mathbf P_i$
- knot vector $U$
- B-Spline basis $N_{i,p}$

只是每个控制点再多一个：

$$
w_i.
$$

所以 NURBS 的数据结构可以理解为：

```text
degree p

control points:
P0
P1
P2
...

weights:
w0
w1
w2
...

knot vector:
u0, u1, u2, ...
```

---

# 33. “Non-Uniform”为什么写进名字里？

这其实有一点历史原因。

NURBS 强调 knot vector 可以是：

$$
\boxed{\text{non-uniform}}
$$

也就是 knot 间距不要求一致。

例如：

$$
U=
\{0,0,0,0,\;0.2,\;0.7,\;1.3,\;2,2,2,2\}.
$$

内部间距分别可能是：

$$
0.2,\ 0.5,\ 0.6,\ 0.7.
$$

它们完全可以不同。

甚至还可以重复：

$$
U=
\{0,0,0,0,\;0.5,0.5,\;1,\;2,2,2,2\}.
$$

于是：

$$
\boxed{
\text{knot spacing + knot multiplicity + weights}
}
$$

共同控制 NURBS。

---

# 34. 所以 NURBS 有三层控制手段

你现在可以把它理解成三个层次。

第一层：

$$
\boxed{\mathbf P_i}
$$

控制点的位置。

改变它：

$$
\mathbf P_i\rightarrow\mathbf P_i'
$$

是在几何空间里移动控制点。

---

第二层：

$$
\boxed{w_i}
$$

控制这个点影响曲线的强弱。

---

第三层：

$$
\boxed{U}
$$

knot vector 控制 basis 在参数空间中的分布、局部区间以及连续性。

所以 NURBS 的表达能力来自：

$$
\boxed{
\text{control points}
+
\text{weights}
+
\text{knots}
}
$$

---

# 35. knot multiplicity 的连续性规则仍然一样

设 degree：

$$
p.
$$

某个内部 knot 的 multiplicity 为：

$$
r.
$$

在通常非退化条件下，曲线连续性仍然是：

$$
\boxed{
C^{p-r}
}
$$

例如 cubic NURBS：

$$
p=3.
$$

单 knot：

$$
r=1
$$

得到：

$$
C^2.
$$

双 knot：

$$
r=2
$$

得到：

$$
C^1.
$$

三重 knot：

$$
r=3
$$

得到：

$$
C^0.
$$

所以从 B-Spline 学到的 knot 机制全部继续成立。

---

# 36. NURBS 能表示什么？

现在它既保留了 B-Spline 的自由曲线能力，又加入了 rational 能力。

所以它既可以表示：

$$
\boxed{\text{free-form curves}}
$$

也可以精确表示大量经典解析几何对象：

- 直线
- Bézier
- B-Spline
- 圆弧
- 圆
- 椭圆
- 抛物线
- 双曲线

曲面情况下还可以表示：

- plane
- cylinder
- cone
- sphere
- torus
- general free-form surface

所以 NURBS 很适合 CAD：

$$
\boxed{
\text{一种统一表示方式覆盖大量几何对象}
}
$$

---

# 37. 但有一个特别重要的区别：几何 ≠ 参数化

NURBS 可以精确表示圆。

但这并不意味着：

$$
u
$$

就是圆弧角度。

例如：

$$
u=0.5
$$

不一定意味着：

$$
50\%\text{ 的弧长}
$$

一般来说：

$$
\boxed{
\text{parameter spacing}
\neq
\text{arc-length spacing}
}
$$

这点在 CAD 几何算法中特别重要。

如果你按：

$$
u=0,0.1,0.2,\ldots
$$

均匀采样，

得到的空间点一般不是等距的。

---

# 38. 为什么叫“控制点”，而不是“插值点”？

和 B-Spline 一样，NURBS 一般也不会经过所有控制点。

控制点作用是：

$$
\boxed{\text{控制几何形状}}
$$

而不是：

$$
\boxed{\text{要求曲线经过}}
$$

对于 clamped NURBS，一般可以让：

$$
\mathbf C(u_{\min})=\mathbf P_0
$$

以及：

$$
\mathbf C(u_{\max})=\mathbf P_n.
$$

但中间控制点通常只是拉动曲线。

---

# 39. 正权重情况下，NURBS 仍有很好的凸包性质

通常 CAD 使用：

$$
\boxed{w_i>0}
$$

如果所有相关权重为正，那么 rational basis：

$$
R_{i,p}(u)\geq0.
$$

而且：

$$
\sum_iR_{i,p}(u)=1.
$$

因此：

$$
\mathbf C(u)
=

\sum_iR_{i,p}(u)\mathbf P_i
$$

仍然是控制点的 convex combination。

所以曲线仍然受到局部 convex hull 的约束。

这也是为什么 NURBS 数值行为通常比较稳定。

---

# 40. 一个很有意思的性质：所有 weight 同时乘同一个常数，曲线不变

假设：

$$
w_i'
=

kw_i
$$

其中：

$$
k\neq0.
$$

新的 NURBS：

$$
\mathbf C'(u)
=

\frac{
\sum_iN_i(kw_i)\mathbf P_i
}{
\sum_iN_i(kw_i)
}.
$$

上下提出 $k$：

$$
=

\frac{
k\sum_iN_iw_i\mathbf P_i
}{
k\sum_iN_iw_i
}.
$$

约去：

$$
k.
$$

于是：

$$
\boxed{
\mathbf C'(u)=\mathbf C(u)
}
$$

所以真正有意义的是：

$$
\boxed{\text{weight 之间的相对比例}}
$$

而不是绝对大小。

例如：

$$
(1,2,1)
$$

和：

$$
(10,20,10)
$$

定义完全相同的 NURBS 曲线。

---

# 41. 用一张关系图总结 Bézier → B-Spline → NURBS

现在三章可以完整串起来：

```text
                    NURBS
                      │
              knots + weights
                      │
         ┌────────────┴────────────┐
         │                         │
   all weights equal       one polynomial span
         │                         │
     B-Spline               Rational Bézier
         │                         │
 one polynomial span         all weights equal
         │                         │
         └────────── Bézier ───────┘
```

从能力增加的角度：

$$
\boxed{
\text{Bézier}
\xrightarrow{+\text{knots}}
\text{B-Spline}
\xrightarrow{+\text{weights / rational}}
\text{NURBS}
}
$$

---

# 42. 从公式角度再串一次

### Bézier

$$
\boxed{
\mathbf C(t)
=

\sum_iB_i^p(t)\mathbf P_i
}
$$

其中 basis 是 Bernstein polynomial。

---

### B-Spline

$$
\boxed{
\mathbf C(u)
=

\sum_iN_{i,p}(u)\mathbf P_i
}
$$

其中 basis 由 knot vector 和 Cox–de Boor 决定。

---

### NURBS

$$
\boxed{
\mathbf C(u)
=

\frac{
\sum_iN_{i,p}(u)w_i\mathbf P_i
}{
\sum_iN_{i,p}(u)w_i
}
}
$$

或者定义：

$$
R_{i,p}(u)
=

\frac{
N_{i,p}(u)w_i
}{
\sum_jN_{j,p}(u)w_j
}
$$

之后：

$$
\boxed{
\mathbf C(u)
=

\sum_iR_{i,p}(u)\mathbf P_i
}
$$

---

# 43. 从几何直觉再串一次

Bézier：

$$
\boxed{\text{一段 polynomial curve}}
$$

B-Spline：

$$
\boxed{
\text{很多局部低次 polynomial span 光滑拼接}
}
$$

NURBS：

$$
\boxed{
\text{在 B-Spline 的基础上加入 projective / rational 能力}
}
$$

于是它既能做：

$$
\text{free-form}
$$

又能做：

$$
\text{exact conics}.
$$

---

# 44. 如果你以后自己实现 NURBS，程序结构其实很直接

先找到参数 $u$ 所在的 knot span。

然后算：

$$
N_{i,p}(u).
$$

再对局部控制点计算：

$$
\text{numerator}
=

\sum_iN_{i,p}(u)w_i\mathbf P_i
$$

以及：

$$
\text{denominator}
=

\sum_iN_{i,p}(u)w_i.
$$

最后：

$$
\boxed{
\mathbf C(u)
=

\frac{\text{numerator}}
{\text{denominator}}
}
$$

如果直接走齐次坐标，则甚至可以写成：

$$
\widetilde{\mathbf P}_i
=

(w_i\mathbf P_i,w_i),
$$

先跑普通 B-Spline evaluation：

$$
\widetilde{\mathbf C}(u)
=

\sum_i
N_{i,p}(u)\widetilde{\mathbf P}_i,
$$

最后 perspective divide：

$$
\boxed{
\mathbf C(u)
=

\frac{
\widetilde{\mathbf C}_{xyz}(u)
}{
\widetilde{\mathbf C}_{w}(u)
}
}
$$

从实现角度看，这个观点尤其干净。

---

# 45. 到这里最应该记住的三个事实

第一：

$$
\boxed{
\text{NURBS 本质上不是一种完全新的 spline}
}
$$

它仍然建立在：

$$
\boxed{\text{B-Spline}}
$$

上。

第二：

$$
\boxed{
\text{weight 不是简单“乘一下”，而是经过归一化形成 rational basis}
}
$$

即：

$$
R_i
=

\frac{N_iw_i}{\sum_jN_jw_j}.
$$

第三，也是最深的一点：

$$
\boxed{
\text{NURBS 是高一维齐次空间中的 B-Spline 投影回来的结果}
}
$$

也就是：

$$
\boxed{
\text{NURBS}
=

\text{homogeneous B-Spline}
+
\text{perspective divide}
}
$$

这也解释了为什么它突然能够精确表示圆锥曲线。

---

# 46. 最后把三章压成一个心智模型

可以一直记住这条演化线：

$$
\boxed{
\text{Bézier}
\rightarrow
\text{B-Spline}
\rightarrow
\text{NURBS}
}
$$

Bézier 解决：

$$
\boxed{
\text{如何用控制点生成平滑 polynomial curve}
}
$$

B-Spline 解决：

$$
\boxed{
\text{如何把大量控制点组织成局部、低次、分段的平滑曲线}
}
$$

NURBS 再解决：

$$
\boxed{
\text{如何在保留 B-Spline 优点的同时，
获得 rational/projective 表达能力，
从而精确表示圆、椭圆等圆锥曲线}
}
$$

所以从数学结构上：

$$
\boxed{
\text{Bernstein basis}
\rightarrow
\text{B-Spline basis}
\rightarrow
\text{Rational B-Spline basis}
}
$$

从几何能力上：

$$
\boxed{
\text{single polynomial}
\rightarrow
\text{piecewise polynomial}
\rightarrow
\text{piecewise rational}
}
$$

而从 CAD 的角度，这最后一步非常关键：

$$
\boxed{
\text{NURBS =
自由曲线与精确解析几何之间的统一语言}
}
$$

可以。你截图里这一步确实压缩得太厉害了。这里把**“为什么权重取 $1/\sqrt2$，代进去以后为什么整个曲线严格是四分之一圆”**完整推一遍。

先声明符号。我们考虑单位圆第一象限的四分之一圆弧，三个控制点取

$$
\mathbf P_0=(1,0),\qquad
\mathbf P_1=(1,1),\qquad
\mathbf P_2=(0,1),
$$

参数为

$$
t\in[0,1].
$$

二次 Bernstein 基函数是

$$
B_0^2(t)=(1-t)^2,
$$

$$
B_1^2(t)=2t(1-t),
$$

$$
B_2^2(t)=t^2.
$$

三个权重记为

$$
w_0,\quad w_1,\quad w_2.
$$

由于两端对称，我们先取

$$
w_0=w_2=1,
$$

中间权重暂时记作

$$
w_1=w.
$$

于是二次 Rational Bézier 曲线为

$$
\mathbf C(t)
=

\frac{
(1-t)^2\mathbf P_0
+
2wt(1-t)\mathbf P_1
+
t^2\mathbf P_2
}{
(1-t)^2
+
2wt(1-t)
+
t^2
}.
$$

---

## 1. 先推导为什么 $w=\frac1{\sqrt2}$

由于整个构造关于直线 $y=x$ 对称，所以当

$$
t=\frac12
$$

时，曲线应该经过四分之一圆弧正中间，也就是圆上的 $45^\circ$ 点：

$$
\mathbf C\left(\frac12\right)
=

\left(
\frac1{\sqrt2},
\frac1{\sqrt2}
\right).
$$

先计算三个 Bernstein 基函数：

$$
B_0^2\left(\frac12\right)
=

\left(1-\frac12\right)^2
=

\frac14,
$$

$$
B_1^2\left(\frac12\right)
=

2\cdot\frac12\cdot\frac12
=

\frac12,
$$

$$
B_2^2\left(\frac12\right)
=

\left(\frac12\right)^2
=

\frac14.
$$

所以

$$
\mathbf C\left(\frac12\right)
=

\frac{
\frac14\mathbf P_0
+
\frac12w\mathbf P_1
+
\frac14\mathbf P_2
}{
\frac14+\frac12w+\frac14
}.
$$

把三个控制点代进去：

$$
\mathbf P_0=(1,0),
\qquad
\mathbf P_1=(1,1),
\qquad
\mathbf P_2=(0,1).
$$

因此分子为

$$
\frac14(1,0)
+
\frac w2(1,1)
+
\frac14(0,1).
$$

分别计算 $x,y$ 分量：

$$
=

\left(
\frac14+\frac w2,
\frac w2+\frac14
\right).
$$

分母为

$$
\frac14+\frac w2+\frac14
=

\frac12+\frac w2
=

\frac{1+w}{2}.
$$

所以

$$
\mathbf C\left(\frac12\right)
=

\left(
\frac{\frac14+\frac w2}{\frac{1+w}{2}},
\frac{\frac14+\frac w2}{\frac{1+w}{2}}
\right).
$$

把每个坐标化简：

$$
\frac{\frac14+\frac w2}{\frac{1+w}{2}}
=

\frac{\frac{1+2w}{4}}{\frac{1+w}{2}}.
$$

除以一个分数等于乘倒数：

$$
=

\frac{1+2w}{4}
\cdot
\frac{2}{1+w}.
$$

于是

$$
=

\frac{1+2w}{2(1+w)}.
$$

因为这个点必须等于圆上的 $45^\circ$ 点，所以要求

$$
\frac{1+2w}{2(1+w)}
=

\frac1{\sqrt2}.
$$

现在解这个方程。

两边乘以 $2(1+w)$：

$$
1+2w
=

\frac{2(1+w)}{\sqrt2}.
$$

因为

$$
\frac2{\sqrt2}=\sqrt2,
$$

所以

$$
1+2w
=

\sqrt2(1+w).
$$

展开：

$$
1+2w
=

\sqrt2+\sqrt2 w.
$$

把含 $w$ 的项放左边：

$$
2w-\sqrt2 w
=

\sqrt2-1.
$$

提取 $w$：

$$
w(2-\sqrt2)
=

\sqrt2-1.
$$

所以

$$
w
=

\frac{\sqrt2-1}{2-\sqrt2}.
$$

注意

$$
2-\sqrt2
=

\sqrt2(\sqrt2-1),
$$

因为

$$
\sqrt2(\sqrt2-1)
=

2-\sqrt2.
$$

因此

$$
w
=

\frac{\sqrt2-1}
{\sqrt2(\sqrt2-1)}
=

\frac1{\sqrt2}.
$$

所以中间权重必须取

$$
\boxed{w_1=\frac1{\sqrt2}}
$$

也就是

$$
\boxed{w_1=\frac{\sqrt2}{2}}.
$$

---

# 2. 所以三个权重就是

$$
\boxed{
w_0=1,\qquad
w_1=\frac1{\sqrt2},\qquad
w_2=1
}
$$

代回 Rational Bézier：

$$
\mathbf C(t)
=

\frac{
(1-t)^2\mathbf P_0
+
2t(1-t)\frac1{\sqrt2}\mathbf P_1
+
t^2\mathbf P_2
}{
(1-t)^2
+
2t(1-t)\frac1{\sqrt2}
+
t^2
}.
$$

中间那一项：

$$
2\cdot\frac1{\sqrt2}
=

\frac2{\sqrt2}.
$$

分子分母同时乘 $\sqrt2$，或者直接利用

$$
2=\sqrt2\sqrt2,
$$

得到

$$
\frac2{\sqrt2}
=

\frac{\sqrt2\sqrt2}{\sqrt2}
=

\sqrt2.
$$

所以

$$
\boxed{
2\cdot\frac1{\sqrt2}=\sqrt2
}
$$

因此曲线变成

$$
\boxed{
\mathbf C(t)
=

\frac{
(1-t)^2\mathbf P_0
+
\sqrt2t(1-t)\mathbf P_1
+
t^2\mathbf P_2
}{
(1-t)^2
+
\sqrt2t(1-t)
+
t^2
}
}
$$

这就是你截图里那一步的来源。

---

# 3. 但是为什么它是“严格的圆”，而不只是穿过几个圆上的点？

这是最关键的一步。

仅仅证明

$$
t=0,\quad \frac12,\quad1
$$

时在圆上，**还不能证明整条曲线都是圆**。

我们必须证明对于任意

$$
t\in[0,1],
$$

都有

$$
x(t)^2+y(t)^2=1.
$$

这才说明它严格落在单位圆上。

---

先把控制点代进去：

$$
\mathbf P_0=(1,0),
$$

$$
\mathbf P_1=(1,1),
$$

$$
\mathbf P_2=(0,1).
$$

于是

$$
\mathbf C(t)
=

\frac{
(1-t)^2(1,0)
+
\sqrt2t(1-t)(1,1)
+
t^2(0,1)
}{
(1-t)^2+\sqrt2t(1-t)+t^2
}.
$$

定义分母

$$
D(t)
=

(1-t)^2+\sqrt2t(1-t)+t^2.
$$

那么 $x$ 坐标为

$$
x(t)
=

\frac{
(1-t)^2+\sqrt2t(1-t)
}{
D(t)
},
$$

而 $y$ 坐标为

$$
y(t)
=

\frac{
\sqrt2t(1-t)+t^2
}{
D(t)
}.
$$

---

# 4. 证明 $x(t)^2+y(t)^2=1$

为了避免式子太长，定义

$$
a=1-t,
\qquad
b=t.
$$

那么

$$
a+b=1.
$$

同时定义

$$
q=\sqrt2ab.
$$

这样上面的三个式子变成

$$
D=a^2+q+b^2,
$$

$$
x=\frac{a^2+q}{D},
$$

$$
y=\frac{q+b^2}{D}.
$$

现在计算

$$
x^2+y^2.
$$

代入：

$$
x^2+y^2
=

\frac{(a^2+q)^2}{D^2}
+
\frac{(q+b^2)^2}{D^2}.
$$

因为分母相同：

$$
=

\frac{
(a^2+q)^2+(q+b^2)^2
}{
D^2
}.
$$

分别展开。

第一项：

$$
(a^2+q)^2
=

a^4+2a^2q+q^2.
$$

第二项：

$$
(q+b^2)^2
=

q^2+2qb^2+b^4.
$$

相加：

$$
(a^2+q)^2+(q+b^2)^2
$$

$$
=

a^4+2a^2q+q^2
+
q^2+2qb^2+b^4.
$$

整理：

$$
=

a^4+b^4
+
2q(a^2+b^2)
+
2q^2.
$$

注意我们定义了

$$
q=\sqrt2ab.
$$

因此

$$
q^2
=

(\sqrt2ab)^2.
$$

逐项平方：

$$
q^2
=

(\sqrt2)^2a^2b^2.
$$

因为

$$
(\sqrt2)^2=2,
$$

所以

$$
\boxed{
q^2=2a^2b^2
}.
$$

因此

$$
2q^2=4a^2b^2.
$$

现在再来看分母

$$
D^2.
$$

因为

$$
D=a^2+q+b^2,
$$

所以

$$
D^2
=

(a^2+q+b^2)^2.
$$

完全展开：

$$
D^2
=

a^4+q^2+b^4
+
2a^2q
+
2a^2b^2
+
2qb^2.
$$

整理：

$$
D^2
=

a^4+b^4
+
2q(a^2+b^2)
+
q^2
+
2a^2b^2.
$$

但是刚才已经知道

$$
q^2=2a^2b^2.
$$

所以

$$
q^2+2a^2b^2
=

q^2+q^2
=

2q^2.
$$

因此

$$
D^2
=

a^4+b^4
+
2q(a^2+b^2)
+
2q^2.
$$

而前面我们算出的分子恰好也是

$$
(a^2+q)^2+(q+b^2)^2
=

a^4+b^4
+
2q(a^2+b^2)
+
2q^2.
$$

所以

$$
(a^2+q)^2+(q+b^2)^2
=

D^2.
$$

因此

$$
x^2+y^2
=

\frac{D^2}{D^2}
=

1.

$$

最终得到

$$
\boxed{x(t)^2+y(t)^2=1}
$$

对于所有

$$
t\in[0,1]
$$

都成立。

所以这不是“看起来很像圆”，也不是数值 approximation，而是：

$$
\boxed{\text{exact quarter circle}}
$$

即**严格的四分之一单位圆**。

---

这里其实体现了 Rational Bézier / NURBS 最核心的一个能力：

> **普通 polynomial Bézier 不能精确表示圆；加入 rational weight 之后，就可以精确表示圆锥曲线。**

而这个例子里真正神奇的关系就是

$$
\boxed{
w_1=\cos45^\circ
=

\frac{\sqrt2}{2}
=

\frac1{\sqrt2}
}
$$

下一步还可以继续推导一个更一般的结论：为什么一段圆弧夹角为 $\theta$ 时，中间控制点的权重普遍是

$$
\boxed{w=\cos\frac{\theta}{2}}
$$

这样四分之一圆的

$$
w=\cos45^\circ=\frac{\sqrt2}{2}
$$

就不再是一个“特殊记忆公式”，而是一般圆弧公式的直接结果。

可以，我们把这个一般结论彻底推出来：

$$
\boxed{w=\cos\frac{\theta}{2}}
$$

而且不只是“碰巧让中点落在圆上”，我们最后还要证明：**整条 Rational Quadratic Bézier 都严格在圆上。**

先从最对称、最容易看清楚的坐标系开始。

---

# 1. 先建立几何模型

考虑一个**单位圆**

$$
x^2+y^2=1.
$$

我们想表示一段总圆心角为

$$
\theta
$$

的圆弧。

为了利用对称性，把这段圆弧关于 $x$ 轴对称。

定义半角

$$
\boxed{\alpha=\frac{\theta}{2}}.
$$

那么两个端点分别位于角度

$$
-\alpha,\qquad +\alpha.
$$

为了后面的公式简洁，再定义

$$
c=\cos\alpha,
\qquad
s=\sin\alpha.
$$

所以有

$$
c^2+s^2=1.
$$

两个圆弧端点是

$$
\boxed{
\mathbf P_0=(c,-s)
}
$$

和

$$
\boxed{
\mathbf P_2=(c,s)
}.
$$

圆弧中间的点，就是角度 $0$ 的地方：

$$
\boxed{
\mathbf M=(1,0)
}.
$$

示意就是：

```text
                    P2=(cos α, sin α)
                   /
                .´
             .´
M=(1,0) •  .´
             `.
                `.
                   \
                    P0=(cos α,-sin α)

            O=(0,0)
```

这里圆弧总角度就是

$$
2\alpha=\theta.
$$

---

# 2. 中间控制点 $\mathbf P_1$ 放在哪里？

这是第一个关键问题。

对于 quadratic Bézier，我们希望曲线在两个端点处的切线方向与圆的切线方向一致。

因此 $\mathbf P_1$ 应该取成：

> 两个端点处圆切线的交点。

下面把它算出来。

---

## 3. 单位圆在一点处的切线方程

单位圆：

$$
x^2+y^2=1.
$$

如果圆上的点是

$$
(x_0,y_0),
$$

那么该点处的切线为

$$
x_0x+y_0y=1.
$$

因此在

$$
\mathbf P_2=(c,s)
$$

处，切线为

$$
cx+sy=1.
$$

在

$$
\mathbf P_0=(c,-s)
$$

处，切线为

$$
cx-sy=1.
$$

所以 $\mathbf P_1$ 是下面两个方程的交点：

$$
\begin{cases}
cx+sy=1,\\
cx-sy=1.
\end{cases}
$$

两式相减：

$$
2sy=0.
$$

如果这不是退化成一个点的圆弧，那么

$$
s\neq0,
$$

所以

$$
y=0.
$$

再代回

$$
cx=1,
$$

得到

$$
x=\frac1c.
$$

因此：

$$
\boxed{
\mathbf P_1=
\left(\frac1c,0\right)
}
$$

也就是

$$
\boxed{
\mathbf P_1=
(\sec\alpha,0)
}.
$$

所以现在三个控制点已经完全确定：

$$
\boxed{
\mathbf P_0=(c,-s)
}
$$

$$
\boxed{
\mathbf P_1=\left(\frac1c,0\right)
}
$$

$$
\boxed{
\mathbf P_2=(c,s)
}
$$

只剩下中间权重 $w$ 不知道。

---

# 4. 写出 Rational Quadratic Bézier

端点权重通常归一化为

$$
w_0=w_2=1,
$$

中间权重记作

$$
w_1=w.
$$

于是

$$
\mathbf C(t)
=

\frac{
(1-t)^2\mathbf P_0
+
2wt(1-t)\mathbf P_1
+
t^2\mathbf P_2
}{
(1-t)^2
+
2wt(1-t)
+
t^2
},
$$

其中

$$
t\in[0,1].
$$

由于整个构造完全对称，因此参数中点

$$
t=\frac12
$$

应该对应圆弧的中点

$$
\mathbf M=(1,0).
$$

这一步就能把 $w$ 解出来。

---

# 5. 计算 $t=\frac12$

三个 Bernstein 系数分别为

$$
(1-t)^2=\frac14,
$$

$$
2t(1-t)=\frac12,
$$

$$
t^2=\frac14.
$$

所以

$$
\mathbf C\left(\frac12\right)
=

\frac{
\frac14\mathbf P_0
+
\frac w2\mathbf P_1
+
\frac14\mathbf P_2
}{
\frac14+\frac w2+\frac14
}.
$$

分母先化简：

$$
\frac14+\frac w2+\frac14
=

\frac12+\frac w2
=

\frac{1+w}{2}.
$$

而分子可以写成

$$
\frac14(\mathbf P_0+\mathbf P_2)
+
\frac w2\mathbf P_1.
$$

我们知道

$$
\mathbf P_0+\mathbf P_2
=

(c,-s)+(c,s)
=

(2c,0).
$$

所以

$$
\frac14(\mathbf P_0+\mathbf P_2)
=

\left(\frac c2,0\right).
$$

另外，

$$
\frac w2\mathbf P_1
=

\frac w2
\left(\frac1c,0\right)
=

\left(\frac{w}{2c},0\right).
$$

所以整个分子是

$$
\left(
\frac c2+\frac{w}{2c},
0
\right).
$$

因此

$$
\mathbf C\left(\frac12\right)
=

\left(
\frac{
\frac c2+\frac{w}{2c}
}{
\frac{1+w}{2}
},
0
\right).
$$

约掉 $\frac12$：

$$
\mathbf C\left(\frac12\right)
=

\left(
\frac{
c+\frac wc
}{
1+w
},
0
\right).
$$

---

# 6. 要求它正好等于圆弧中点

圆弧中点是

$$
\mathbf M=(1,0).
$$

所以必须有

$$
\frac{
c+\frac wc
}{
1+w
}
=1.
$$

两边乘 $1+w$：

$$
c+\frac wc=1+w.
$$

为了消掉分母 $c$，两边乘 $c$：

$$
c^2+w=c+cw.
$$

把含 $w$ 的项放一边：

$$
w-cw=c-c^2.
$$

提取公因子：

$$
w(1-c)=c(1-c).
$$

如果

$$
c\neq1,
$$

也就是圆弧并非零长度，那么可以除以 $1-c$：

$$
\boxed{w=c}.
$$

而之前定义了

$$
c=\cos\alpha.
$$

所以

$$
\boxed{
w=\cos\alpha
}.
$$

又因为

$$
\alpha=\frac{\theta}{2},
$$

最终得到：

$$
\boxed{
w=\cos\frac{\theta}{2}
}.
$$

这就是那个公式的来源。✨

---

# 7. 四分之一圆只是它的特例

如果是四分之一圆，

$$
\theta=90^\circ.
$$

那么

$$
\alpha=\frac{\theta}{2}=45^\circ.
$$

所以

$$
w
=

\cos45^\circ
=

\frac{\sqrt2}{2}.
$$

即

$$
\boxed{
w=\frac1{\sqrt2}
}.
$$

于是你截图里的那个数字根本不是“神奇地猜出来”的：

$$
\boxed{
\frac1{\sqrt2}
=

\cos\frac{90^\circ}{2}
}
$$

它来自一个一般圆弧公式。

---

# 8. 但现在还有一个非常重要的问题

到目前为止，我们只证明了：

1. 两个端点在圆上；
2. 两个端点的切线正确；
3. 参数中点 $t=\frac12$ 也在圆上。

但是严格来说，这仍然还没有证明：

$$
\boxed{\text{所有 }t\text{ 都在圆上}}
$$

所以接下来我们必须真正证明

$$
x(t)^2+y(t)^2=1.
$$

这个证明非常漂亮。

---

# 9. 把 $w=c$ 代入曲线

现在有

$$
w=c,
$$

以及

$$
\mathbf P_0=(c,-s),
$$

$$
\mathbf P_1=\left(\frac1c,0\right),
$$

$$
\mathbf P_2=(c,s).
$$

因此

$$
\mathbf C(t)
=

\frac{
(1-t)^2(c,-s)
+
2ct(1-t)
\left(\frac1c,0\right)
+
t^2(c,s)
}{
(1-t)^2
+
2ct(1-t)
+
t^2
}.
$$

注意中间项有一个非常漂亮的消去：

$$
c\cdot\frac1c=1.
$$

所以

$$
2ct(1-t)
\left(\frac1c,0\right)
=

2t(1-t)(1,0).
$$

于是分子的 $x$ 坐标为

$$
c(1-t)^2
+
2t(1-t)
+
ct^2,
$$

即

$$
N_x
=

c\left[(1-t)^2+t^2\right]
+
2t(1-t).
$$

分子的 $y$ 坐标为

$$
-s(1-t)^2+st^2,
$$

所以

$$
N_y
=

s\left[t^2-(1-t)^2\right].
$$

分母为

$$
D
=

(1-t)^2
+
2ct(1-t)
+
t^2.
$$

因此

$$
x(t)=\frac{N_x}{D},
\qquad
y(t)=\frac{N_y}{D}.
$$

---

# 10. 为了简化，定义两个量

定义

$$
A=(1-t)^2+t^2
$$

以及

$$
B=2t(1-t).
$$

那么一个非常重要的关系是

$$
A+B
=

(1-t)^2+t^2+2t(1-t).
$$

右边实际上就是

$$
[(1-t)+t]^2.
$$

所以

$$
A+B=1.
$$

即

$$
\boxed{A+B=1}.
$$

另外，

$$
A-B
=

(1-t)^2+t^2-2t(1-t).
$$

这正好是平方公式：

$$
A-B
=

[(1-t)-t]^2.
$$

因此

$$
A-B=(1-2t)^2.
$$

也就是

$$
\boxed{
A-B=(2t-1)^2
}.
$$

现在曲线坐标变成

$$
N_x=cA+B,
$$

$$
D=A+cB.
$$

而

$$
N_y
=

s[t^2-(1-t)^2].
$$

我们把最后这个再化简。

---

# 11. 化简 $N_y$

展开：

$$
t^2-(1-t)^2.
$$

先算

$$
(1-t)^2=1-2t+t^2.
$$

所以

$$
t^2-(1-t)^2
=

t^2-(1-2t+t^2).
$$

展开负号：

$$
=

t^2-1+2t-t^2.
$$

因此

$$
=2t-1.
$$

所以

$$
\boxed{
N_y=s(2t-1)
}.
$$

于是现在：

$$
\boxed{
N_x=cA+B
}
$$

$$
\boxed{
N_y=s(2t-1)
}
$$

$$
\boxed{
D=A+cB
}.
$$

---

# 12. 我们要证明什么？

因为

$$
x=\frac{N_x}{D},
\qquad
y=\frac{N_y}{D},
$$

所以

$$
x^2+y^2
=

\frac{N_x^2+N_y^2}{D^2}.
$$

因此只需要证明

$$
\boxed{
N_x^2+N_y^2=D^2
}.
$$

等价地，

$$
D^2-N_x^2=N_y^2.
$$

左边是平方差，可以直接因式分解：

$$
D^2-N_x^2
=

(D-N_x)(D+N_x).
$$

---

# 13. 计算 $D-N_x$

我们有

$$
D=A+cB,
$$

$$
N_x=cA+B.
$$

所以

$$
D-N_x
=

(A+cB)-(cA+B).
$$

展开：

$$
=

A+cB-cA-B.
$$

把 $A$ 和 $B$ 分组：

$$
=

A(1-c)+B(c-1).
$$

注意

$$
c-1=-(1-c).
$$

所以

$$
=

(1-c)A-(1-c)B.
$$

提取 $1-c$：

$$
D-N_x
=

(1-c)(A-B).
$$

前面已经证明

$$
A-B=(2t-1)^2.
$$

所以

$$
\boxed{
D-N_x
=

(1-c)(2t-1)^2
}.
$$

---

# 14. 再计算 $D+N_x$

$$
D+N_x
=

(A+cB)+(cA+B).
$$

展开：

$$
=

A+cB+cA+B.
$$

分组：

$$
=

A(1+c)+B(1+c).
$$

提取 $1+c$：

$$
=

(1+c)(A+B).
$$

而我们已经知道

$$
A+B=1.
$$

所以

$$
\boxed{
D+N_x=1+c
}.
$$

---

# 15. 因此平方差变成

$$
D^2-N_x^2
=

(D-N_x)(D+N_x).
$$

代入：

$$
=

(1-c)(2t-1)^2(1+c).
$$

重新排列：

$$
=

(1-c)(1+c)(2t-1)^2.
$$

利用平方差：

$$
(1-c)(1+c)=1-c^2.
$$

因此

$$
D^2-N_x^2
=

(1-c^2)(2t-1)^2.
$$

但

$$
c=\cos\alpha,
\qquad
s=\sin\alpha.
$$

所以

$$
c^2+s^2=1.
$$

于是

$$
1-c^2=s^2.
$$

因此

$$
D^2-N_x^2
=

s^2(2t-1)^2.
$$

而前面已经得到

$$
N_y=s(2t-1).
$$

所以

$$
N_y^2
=

s^2(2t-1)^2.
$$

因此

$$
\boxed{
D^2-N_x^2=N_y^2
}.
$$

移项：

$$
\boxed{
N_x^2+N_y^2=D^2
}.
$$

最后：

$$
x^2+y^2
=

\frac{N_x^2+N_y^2}{D^2}
=

\frac{D^2}{D^2}.
$$

所以

$$
\boxed{x^2+y^2=1}.
$$

而且这个等式对于**任意**

$$
t\in[0,1]
$$

都成立。

所以这条 Rational Bézier 不是“非常接近圆”，而是真正：

$$
\boxed{\text{exact circle arc}}
$$

---

# 16. 现在可以真正理解 $w=\cos(\theta/2)$ 在干什么

这里三个东西共同配合：

$$
\boxed{
\begin{aligned}
\mathbf P_0&=(\cos\alpha,-\sin\alpha),\\
\mathbf P_1&=(\sec\alpha,0),\\
\mathbf P_2&=(\cos\alpha,\sin\alpha),
\end{aligned}
}
$$

以及

$$
\boxed{
w_0=1,\qquad
w_1=\cos\alpha,\qquad
w_2=1.
}
$$

其中

$$
\alpha=\frac{\theta}{2}.
$$

特别值得注意的是：

$$
w_1\mathbf P_1
=

\cos\alpha
\left(\frac1{\cos\alpha},0\right)
=

(1,0).
$$

也就是说，

$$
\boxed{
w_1\mathbf P_1=\mathbf M
}
$$

恰好就是圆弧中间方向上的单位圆点。

这不是偶然。

**控制点 $\mathbf P_1$** 因为要满足正确切线，被推到了圆外面：

$$
\mathbf P_1=(\sec\alpha,0).
$$

而**权重**

$$
w_1=\cos\alpha
$$

又恰好把这个“跑到圆外的控制点”在齐次空间里补偿回来：

$$
\cos\alpha\cdot\sec\alpha=1.
$$

这已经开始暴露 Rational Bézier 真正的本质了：

> 它不是简单地“给普通 Bézier 的控制点加一个吸引力参数”。

更本质地说，它是**高一维空间里的普通 polynomial Bézier，经过透视除法投影回来的结果**。

这也正是为什么圆、椭圆、双曲线这些 **conic section（二次曲线）** 能被 Rational Bézier / NURBS 精确表示。

如果接着往下讲，最值得讲的下一章就是这个：

$$
\boxed{\text{为什么 Rational Bézier = 齐次坐标中的普通 Bézier}}
$$

把这个搞懂以后，**weight 到底是什么**会一下子变得非常清楚。
