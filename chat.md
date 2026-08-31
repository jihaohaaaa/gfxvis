可以。下面把**完整的 Vulkan 透视正确插值链条**从

$$
\boxed{\text{Local}\to\text{World}\to\text{View}\to\text{Clip}\to\text{NDC}\to\text{Screen}}
$$

完整写出来，并且严格证明：

$$
\boxed{
\text{Local 空间的重心坐标}
\quad\lambda_i
$$

如何从 rasterizer 在屏幕三角形上得到的：

$$
\boxed{
\text{Screen 空间重心坐标}
\quad\lambda_i'
}
$$

通过每个顶点的 clip-space \(w_i\) 恢复。

先把所有符号一次性声明清楚。

---

# 0. 符号总表

考虑一个三角形，三个顶点编号：

$$
i\in\{0,1,2\}.
$$

每个顶点在各空间中的位置：

$$
P_i^L\in\mathbb R^3
$$

表示 **Local Space**；

$$
P_i^W\in\mathbb R^3
$$

表示 **World Space**；

$$
P_i^V\in\mathbb R^3
$$

表示 **View Space**。

把三维点写成齐次坐标：

$$
\bar P_i^L=
\begin{bmatrix}
P_i^L\\1
\end{bmatrix},
\qquad
\bar P_i^W=
\begin{bmatrix}
P_i^W\\1
\end{bmatrix},
\qquad
\bar P_i^V=
\begin{bmatrix}
P_i^V\\1
\end{bmatrix}.
$$

定义三个矩阵：

$$
M\in\mathbb R^{4\times4}
$$

为 **Model Matrix**；

$$
V\in\mathbb R^{4\times4}
$$

为 **View Matrix**；

$$
\Pi\in\mathbb R^{4\times4}
$$

为 **Projection Matrix**。

为了避免把 View Matrix \(V\) 和 View Space \(P_i^V\) 混淆，后面都写完整。

---

# 1. Local \(\to\) World

定义：

$$
\boxed{
\bar P_i^W=M\bar P_i^L
}
$$

对于通常的仿射 Model Matrix：

$$
M=
\begin{bmatrix}
A_M&t_M\\
0&1
\end{bmatrix}
$$

其中：

$$
A_M\in\mathbb R^{3\times3},
\qquad
t_M\in\mathbb R^3.
$$

所以实际上：

$$
P_i^W=A_MP_i^L+t_M.
$$

这是仿射变换。

---

# 2. World \(\to\) View

定义：

$$
\boxed{
\bar P_i^V=V\bar P_i^W
}
$$

通常：

$$
V=
\begin{bmatrix}
A_V&t_V\\
0&1
\end{bmatrix}
$$

于是：

$$
P_i^V=A_VP_i^W+t_V.
$$

因此：

$$
\boxed{
\text{Local}\to\text{World}\to\text{View}
}
$$

整个过程是仿射变换的复合，因此仍然是仿射变换：

$$
\bar P_i^V=VM\bar P_i^L.
$$

---

# 3. 现在定义 Local 空间中的一个内部点

设三角形内部有一个点：

$$
P^L
$$

它在 Local Space 中的重心坐标定义为：

$$
\boxed{
\lambda_0+\lambda_1+\lambda_2=1
}
$$

并且：

$$
\boxed{
P^L=
\lambda_0P_0^L+
\lambda_1P_1^L+
\lambda_2P_2^L
}
$$

这里的：

$$
\boxed{
\lambda_0,\lambda_1,\lambda_2
}
$$

就是我们最终想从屏幕空间恢复出来的**原始局部空间重心坐标**。

---

# 4. 为什么 Local 的重心坐标经过 World / View 不变？

先看 Local \(\to\) World。

因为：

$$
P^W=A_MP^L+t_M
$$

代入：

$$
P^W
=
A_M
\left(
\sum_i\lambda_iP_i^L
\right)
+t_M.
$$

由于：

$$
\sum_i\lambda_i=1,
$$

所以：

$$
P^W
=
\sum_i\lambda_iA_MP_i^L
+
\sum_i\lambda_it_M.
$$

因此：

$$
\boxed{
P^W
=
\sum_i\lambda_i
(A_MP_i^L+t_M)
}
$$

也就是：

$$
\boxed{
P^W=
\lambda_0P_0^W+
\lambda_1P_1^W+
\lambda_2P_2^W
}
$$

所以：

$$
\boxed{
\lambda_i^{L}=\lambda_i^{W}
}
$$

---

同理，World \(\to\) View：

$$
P^V=A_VP^W+t_V
$$

所以：

$$
P^V
=
\sum_i\lambda_iP_i^V.
$$

因此：

$$
\boxed{
\lambda_i^L
=
\lambda_i^W
=
\lambda_i^V
}
$$

也就是说：

> **所有仿射变换都不会改变三角形内部点的重心坐标。**

---

# 5. View \(\to\) Clip：这里事情开始变化

定义：

$$
\boxed{
C_i=\Pi\bar P_i^V
}
$$

其中：

$$
C_i=
\begin{bmatrix}
x_i^c\\
y_i^c\\
z_i^c\\
w_i
\end{bmatrix}.
$$

这里的 \(w_i\) 是每个顶点自己的 clip-space \(w\)。

注意：

$$
\Pi
$$

在 **4D 齐次坐标空间中是线性变换**：

$$
C=\Pi\bar P^V.
$$

因此我们的小点也满足：

$$
\bar P^V
=
\sum_i\lambda_i\bar P_i^V
$$

因为：

$$
\sum_i\lambda_i=1.
$$

所以：

$$
C
=
\Pi\bar P^V
=
\Pi\left(
\sum_i\lambda_i\bar P_i^V
\right).
$$

利用线性性：

$$
C
=
\sum_i\lambda_i\Pi\bar P_i^V.
$$

因此：

$$
\boxed{
C=
\sum_i\lambda_iC_i
}
$$

也就是说：

$$
\boxed{
\begin{aligned}
x^c&=\sum_i\lambda_i x_i^c,\\
y^c&=\sum_i\lambda_i y_i^c,\\
z^c&=\sum_i\lambda_i z_i^c,\\
w&=\sum_i\lambda_i w_i.
\end{aligned}
}
$$

到这里为止，\(\lambda_i\) 仍然没变。

---

# 6. 真正改变重心坐标的是 Perspective Divide

现在从 Clip Space 进入 NDC：

$$
\boxed{
x^n=\frac{x^c}{w},
\qquad
y^n=\frac{y^c}{w},
\qquad
z^n=\frac{z^c}{w}
}
$$

因此：

$$
P^N=
\begin{bmatrix}
x^n\\
y^n\\
z^n
\end{bmatrix}.
$$

顶点：

$$
P_i^N
=
\frac{C_i}{w_i}
=
\begin{bmatrix}
x_i^c/w_i\\
y_i^c/w_i\\
z_i^c/w_i
\end{bmatrix}.
$$

注意：

$$
P^N=\frac{C}{w}
$$

而：

$$
C=\sum_i\lambda_iC_i,
\qquad
w=\sum_i\lambda_iw_i.
$$

所以：

$$
P^N
=
\frac{
\sum_i\lambda_iC_i
}{
\sum_i\lambda_iw_i
}.
$$

这一步就是整个问题的核心。

---

# 7. 把它改写成 NDC 顶点的线性组合

因为：

$$
C_i=w_iP_i^N
$$

所以：

$$
P^N
=
\frac{
\sum_i\lambda_iw_iP_i^N
}{
\sum_i\lambda_iw_i
}.
$$

定义一个新的系数：

$$
\boxed{
\lambda_i'
=
\frac{
\lambda_iw_i
}{
\displaystyle\sum_j\lambda_jw_j
}
}
$$

那么：

$$
\sum_i\lambda_i'
=
\frac{
\sum_i\lambda_iw_i
}{
\sum_j\lambda_jw_j
}
=1.
$$

并且：

$$
P^N
=
\sum_i\lambda_i'P_i^N.
$$

所以我们得到了：

$$
\boxed{
P^N=
\lambda_0'P_0^N+
\lambda_1'P_1^N+
\lambda_2'P_2^N
}
$$

这说明：

$$
\boxed{
\lambda_i'
}
$$

正是这个点在 **NDC 三角形**中的普通重心坐标。

而它和 Local 空间原始重心坐标的关系是：

$$
\boxed{
\lambda_i'
=
\frac{\lambda_iw_i}
{\lambda_0w_0+\lambda_1w_1+\lambda_2w_2}
}
$$

这就是透视造成的重心坐标扭曲。

---

# 8. 从 \(\lambda_i'\) 反过来恢复 \(\lambda_i\)

现在直接开始反解。

我们有：

$$
\lambda_i'
=
\frac{\lambda_iw_i}
{\sum_j\lambda_jw_j}.
$$

两边同时除以 \(w_i\)：

$$
\frac{\lambda_i'}{w_i}
=
\frac{\lambda_i}
{\sum_j\lambda_jw_j}.
$$

于是：

$$
\lambda_i
\propto
\frac{\lambda_i'}{w_i}.
$$

也就是说：

$$
\boxed{
\lambda_i
\propto
\frac{\lambda_i'}{w_i}
}
$$

但是目前只是**成比例**，还没有保证：

$$
\sum_i\lambda_i=1.
$$

所以需要归一化。

先计算：

$$
\sum_j\frac{\lambda_j'}{w_j}.
$$

代入：

$$
\frac{\lambda_j'}{w_j}
=
\frac{\lambda_j}
{\sum_k\lambda_kw_k}
$$

所以：

$$
\sum_j\frac{\lambda_j'}{w_j}
=
\frac{
\sum_j\lambda_j
}{
\sum_k\lambda_kw_k
}.
$$

因为：

$$
\sum_j\lambda_j=1,
$$

因此：

$$
\boxed{
\sum_j\frac{\lambda_j'}{w_j}
=
\frac{1}{
\sum_k\lambda_kw_k
}
}
$$

于是：

$$
\frac{
\lambda_i'/w_i
}{
\sum_j\lambda_j'/w_j
}
=
\frac{
\lambda_i/(\sum_k\lambda_kw_k)
}{
1/(\sum_k\lambda_kw_k)
}
=
\lambda_i.
$$

最终得到：

$$
\boxed{
\color{#000000}{
\lambda_i
=
\frac{\lambda_i'/w_i}
{\displaystyle\sum_j\lambda_j'/w_j}
}
}
$$

这就是**透视正确重心坐标恢复公式**。

---

# 9. 现在加入 Screen Space

到目前为止我们得到的是：

$$
P^N
=
\sum_i\lambda_i'P_i^N.
$$

接下来 Vulkan 做 viewport transform。

设 viewport 为：

$$
\mathcal V
$$

它把 NDC 坐标映射到 framebuffer/screen coordinates：

$$
P^S=\mathcal V(P^N).
$$

对 \(x,y\) 而言：

$$
x^s=s_xx^n+t_x,
$$

$$
y^s=s_yy^n+t_y.
$$

这仍然是一个仿射变换。

所以它**不会改变重心坐标**。

因此：

$$
\boxed{
\lambda_i^{S}=\lambda_i^{N}
}
$$

也就是说，实际 rasterizer 在屏幕三角形上求出来的 barycentric：

$$
\boxed{
\lambda_i^S
}
$$

就是我们上面一直叫的：

$$
\boxed{
\lambda_i'
}
$$

所以以后可以直接写：

$$
\lambda_i'
=
\lambda_i^S.
$$

---

# 10. 整条链终于可以写完整了

现在可以把三个不同阶段的重心坐标区分清楚：

### Local / World / View / Clip

都使用：

$$
\boxed{
\lambda_i
}
$$

因为这些变换不会破坏仿射关系。

然后 perspective divide：

$$
\boxed{
\lambda_i
\longrightarrow
\lambda_i'
}
$$

其中：

$$
\boxed{
\lambda_i'
=
\frac{\lambda_iw_i}
{\sum_j\lambda_jw_j}
}
$$

接着 NDC → Screen 是仿射：

$$
\boxed{
\lambda_i'
\longrightarrow
\lambda_i'
}
$$

所以 rasterizer 从 screen triangle 中得到：

$$
\boxed{
\lambda_i'
}
$$

最后我们反过来恢复：

$$
\boxed{
\lambda_i
=
\frac{\lambda_i'/w_i}
{\sum_j\lambda_j'/w_j}
}
$$

---

# 11. 用一张图把它串起来

```text
Local Space
──────────────────────────────

Pᶫ = Σ λᵢ Pᵢᶫ
       │
       │ M
       ▼
World Space

Pʷ = Σ λᵢ Pᵢʷ
       │
       │ V
       ▼
View Space

Pᵛ = Σ λᵢ Pᵢᵛ
       │
       │ Projection Π
       ▼
Clip Space

C = Σ λᵢ Cᵢ
  = (xᶜ,yᶜ,zᶜ,w)

       │
       │ Perspective Divide
       │ (x,y,z) / w
       ▼

NDC

Pᴺ = Σ λᵢ' Pᵢᴺ

其中

λᵢ' = λᵢ wᵢ / Σⱼ λⱼwⱼ

       │
       │ Viewport Transform
       │ affine
       ▼

Screen Space

Pˢ = Σ λᵢ' Pᵢˢ

       │
       │ Rasterizer
       ▼

得到屏幕重心坐标 λᵢ'

       │
       │ Perspective Correction
       │ divide by wᵢ
       ▼

λᵢ
=
(λᵢ'/wᵢ)
----------------
 Σⱼ(λⱼ'/wⱼ)

       │
       ▼

恢复 Local / World / View
中的正确重心插值权重
```

---

# 12. 因此顶点属性为什么也能正确插值？

假设每个顶点有一个属性：

$$
A_0,A_1,A_2.
$$

这个属性定义在三角形的仿射参数上，因此正确值应该是：

$$
A=
\lambda_0A_0+
\lambda_1A_1+
\lambda_2A_2.
$$

而 rasterizer 给你的只有：

$$
\lambda_i'.
$$

利用：

$$
\lambda_i
=
\frac{\lambda_i'/w_i}
{\sum_j\lambda_j'/w_j},
$$

得到：

$$
A=
\sum_i
\frac{\lambda_i'/w_i}
{\sum_j\lambda_j'/w_j}
A_i.
$$

整理：

$$
\boxed{
A=
\frac{
\displaystyle
\sum_i\frac{\lambda_i'A_i}{w_i}
}{
\displaystyle
\sum_j\frac{\lambda_j'}{w_j}
}
}
$$

这就是 Vulkan / GPU `smooth` interpolation 背后的数学本质。

---

# 13. 为什么 GPU 又常说插值 \(A/w\) 和 \(1/w\)？

因为：

$$
A
=
\frac{
\sum_i\lambda_i'A_i/w_i
}{
\sum_i\lambda_i'/w_i
}.
$$

定义：

$$
B_i=\frac{A_i}{w_i},
\qquad
C_i=\frac1{w_i}.
$$

那么 GPU 只需要对两个量分别做屏幕空间线性插值：

$$
B=
\sum_i\lambda_i'B_i
$$

和：

$$
C=
\sum_i\lambda_i'C_i.
$$

最后：

$$
\boxed{
A=\frac BC
}
$$

也就是：

$$
\boxed{
A=
\frac{
(A/w)_{\mathrm{interpolated}}
}{
(1/w)_{\mathrm{interpolated}}
}
}
$$

这和刚刚的 barycentric correction 完全等价。

---

# 14. 最后一个非常关键的结论

你前面一直在追的逻辑，现在可以非常精确地表述成：

$$
\boxed{
\begin{aligned}
\text{Local}&\xrightarrow{\text{affine}} \text{World}\\
&\xrightarrow{\text{affine}} \text{View}\\
&\xrightarrow{\text{homogeneous linear}} \text{Clip}\\
&\xrightarrow{\text{perspective divide}} \text{NDC}\\
&\xrightarrow{\text{affine}} \text{Screen}
\end{aligned}
}
$$

只有中间这一步：

$$
\boxed{
\text{Clip}\to\text{NDC}
}
$$

把原来的重心坐标：

$$
\lambda_i
$$

变成了：

$$
\boxed{
\lambda_i'
=
\frac{\lambda_iw_i}{\sum_j\lambda_jw_j}
}
$$

而整个透视正确插值，就是把它反解：

$$
\boxed{
\lambda_i
=
\frac{\lambda_i'/w_i}
{\sum_j\lambda_j'/w_j}
}
$$

所以最本质的关系实际上只有这一组：

$$
\boxed{
\lambda_i'
\propto
\lambda_iw_i
}
$$

因此：

$$
\boxed{
\lambda_i
\propto
\frac{\lambda_i'}{w_i}
}
$$

再加上：

$$
\sum_i\lambda_i=1
$$

完成归一化。

---

## ⚠️ 唯一需要额外说明：Clipping

上面的推导假设我们讨论的是**没有被视锥裁剪、或者已经把 clipping 产生的新顶点正确纳入之后的三角形**。

真实 Vulkan pipeline 是：

$$
\text{Clip}
\rightarrow
\text{Clipping}
\rightarrow
\text{Perspective Divide}
\rightarrow
\text{Rasterization}.
$$

如果三角形穿过 near plane / side plane，Vulkan 会先产生新的 clip vertices。此时不能简单地说“screen 上的三个顶点还是最初 local 的三个顶点”；但**透视正确插值的核心 \(w\)-correction 关系完全不变**。

---

### 最值得记住的一行

如果你正在自己写 soft rasterizer，那么整个问题最终可以压缩成：

$$
\boxed{
\text{Screen barycentric}
\quad
\lambda_i'
\quad\xrightarrow{\ /\ w_i,\ normalize\ }\quad
\text{original barycentric}
\quad
\lambda_i
}
$$

即：

$$
\boxed{
\lambda_i
=
\frac{\lambda_i'/w_i}
{\lambda_0'/w_0+\lambda_1'/w_1+\lambda_2'/w_2}
}
$$

**这里的 \(w_i\) 是三个原始顶点的 clip-space \(w\)，不是像素自己的 \(w\)。**

这就是从 Local 的重心坐标，一路经过 Vulkan 的 Local → World → View → Clip → NDC → Screen，最终再从 Screen barycentric 恢复回来的完整数学链条。

---

对，你指出的地方完全正确。这里最容易混淆的是 **“成比例”** 和 **“等式”**。

我前面这一步：

$$
\frac{\lambda_i'}{w_i}
=
\frac{\lambda_i}{\sum_j\lambda_jw_j}
$$

然后写：

$$
\lambda_i\propto\frac{\lambda_i'}{w_i}
$$

**不是说那个求和消失了**。

它只是说：右边有一个**对所有 \(i\) 都相同的公共因子**。

---

## 1. 把这个公共因子单独命名

先定义：

$$
\boxed{
S=\sum_j\lambda_jw_j
}
$$

注意：

$$
S
$$

虽然里面包含所有的 \(\lambda_j\)，但对当前正在讨论的某一个 \(i\) 来说，**它是同一个数**。

于是：

$$
\frac{\lambda_i'}{w_i}
=
\frac{\lambda_i}{S}
$$

等价于：

$$
\boxed{
\lambda_i
=
S\frac{\lambda_i'}{w_i}
}
$$

因此：

$$
\lambda_0=S\frac{\lambda_0'}{w_0}
$$

$$
\lambda_1=S\frac{\lambda_1'}{w_1}
$$

$$
\lambda_2=S\frac{\lambda_2'}{w_2}
$$

这时候就非常明显了：

$$
\boxed{
\lambda_i
=
S
\left(
\frac{\lambda_i'}{w_i}
\right)
}
$$

也就是说，三个 \(\lambda_i\) 都是对应三个 \(\lambda_i'/w_i\) **乘上同一个未知常数 \(S\)**。

所以才可以写：

$$
\boxed{
\lambda_i\propto\frac{\lambda_i'}{w_i}
}
$$

---

# 2. 你说的“可是 \(S\) 里面不还有 \(\lambda_i\) 吗？”

**是的，确实还有。**

这恰恰是为什么我们现在还没有直接求出 \(\lambda_i\)。

因为：

$$
S=\lambda_0w_0+\lambda_1w_1+\lambda_2w_2
$$

里面确实有我们正在求的：

$$
\lambda_0,\lambda_1,\lambda_2.
$$

所以我们不能说：

$$
S=\text{已知常数}
$$

它目前是**未知数**。

但是关键是：

> 我们不需要先求出 \(S\)。

因为重心坐标还有一个额外条件：

$$
\boxed{
\lambda_0+\lambda_1+\lambda_2=1
}
$$

这个条件正好可以把这个未知的公共尺度 \(S\) 消掉。

---

# 3. 直接把它消掉

我们已经得到：

$$
\lambda_i=S\frac{\lambda_i'}{w_i}.
$$

对 \(i=0,1,2\) 求和：

$$
\lambda_0+\lambda_1+\lambda_2
=
S
\left(
\frac{\lambda_0'}{w_0}
+
\frac{\lambda_1'}{w_1}
+
\frac{\lambda_2'}{w_2}
\right).
$$

左边根据重心坐标定义就是：

$$
1.
$$

所以：

$$
1
=
S
\sum_j\frac{\lambda_j'}{w_j}.
$$

于是：

$$
\boxed{
S=
\frac{1}{
\displaystyle\sum_j\frac{\lambda_j'}{w_j}
}
}
$$

现在把它代回：

$$
\lambda_i
=
\frac{\lambda_i'}{w_i}
\cdot
\frac{1}{
\displaystyle\sum_j\frac{\lambda_j'}{w_j}
}.
$$

因此：

$$
\boxed{
\lambda_i
=
\frac{\lambda_i'/w_i}
{\displaystyle\sum_j\lambda_j'/w_j}
}
$$

这就是最终公式。

---

# 4. 为什么这里可以说“成比例”？

你可以先忘掉所有几何，只看普通代数。

假设：

$$
a_0=2,\qquad a_1=3,\qquad a_2=5.
$$

然后定义：

$$
b_i=\frac{a_i}{10}.
$$

那么：

$$
b_0=0.2,\quad b_1=0.3,\quad b_2=0.5.
$$

于是：

$$
a_i=10b_i.
$$

我们可以说：

$$
\boxed{
a_i\propto b_i
}
$$

虽然那个 \(10\) 没有消失。

而如果你知道：

$$
a_0+a_1+a_2=1
$$

那么就可以反过来归一化：

$$
a_i=
\frac{b_i}{b_0+b_1+b_2}.
$$

这就是这里完全相同的数学结构。

---

# 5. 用具体数字看最清楚

假设真实重心坐标是：

$$
\lambda_0=0.2,\qquad
\lambda_1=0.3,\qquad
\lambda_2=0.5.
$$

假设三个顶点的 clip \(w\) 是：

$$
w_0=1,\qquad
w_1=2,\qquad
w_2=4.
$$

先计算：

$$
S
=
0.2(1)+0.3(2)+0.5(4)
=
3.
$$

因此屏幕重心坐标：

$$
\lambda_0'
=
\frac{0.2(1)}{3}
=
\frac1{15},
$$

$$
\lambda_1'
=
\frac{0.3(2)}{3}
=
\frac15,
$$

$$
\lambda_2'
=
\frac{0.5(4)}{3}
=
\frac23.
$$

现在假装我们只知道屏幕上的：

$$
\lambda_0'=\frac1{15},\quad
\lambda_1'=\frac15,\quad
\lambda_2'=\frac23
$$

以及：

$$
w_0=1,\quad w_1=2,\quad w_2=4.
$$

先除以 \(w_i\)：

$$
\frac{\lambda_0'}{w_0}
=
\frac1{15},
$$

$$
\frac{\lambda_1'}{w_1}
=
\frac1{10},
$$

$$
\frac{\lambda_2'}{w_2}
=
\frac16.
$$

它们还不是最终重心坐标，因为：

$$
\frac1{15}+\frac1{10}+\frac16
=
\frac13.
$$

于是归一化：

$$
\lambda_0
=
\frac{1/15}{1/3}
=
\frac15
=
0.2,
$$

$$
\lambda_1
=
\frac{1/10}{1/3}
=
\frac3{10}
=
0.3,
$$

$$
\lambda_2
=
\frac{1/6}{1/3}
=
\frac12
=
0.5.
$$

完全恢复。

---

# 6. 你真正卡住的点其实是“消元”

你看到：

$$
\frac{\lambda_i'}{w_i}
=
\frac{\lambda_i}
{\sum_j\lambda_jw_j}
$$

会想：

> “等等，右边的 denominator 还是有 \(\lambda_i\)，所以怎么能把它拿掉？”

答案是：

**没有拿掉。**

我们只是把它暂时叫成：

$$
S=\sum_j\lambda_jw_j.
$$

于是：

$$
\lambda_i=S\frac{\lambda_i'}{w_i}.
$$

然后利用另一个独立条件：

$$
\sum_i\lambda_i=1
$$

把 \(S\) 消掉。

因此这个过程其实就是一个非常普通的**代数消元**：

$$
\boxed{
\begin{aligned}
\lambda_i'&=\frac{\lambda_iw_i}{S}\\
S&=\sum_j\lambda_jw_j\\
\sum_i\lambda_i&=1
\end{aligned}
}
$$

最终消掉 \(S\)，得到：

$$
\boxed{
\lambda_i=
\frac{\lambda_i'/w_i}
{\sum_j\lambda_j'/w_j}
}
$$

---

## 7. 一个更本质的理解

其实：

$$
\lambda_i'
$$

告诉你的不是原始 \(\lambda_i\)，而是：

$$
\boxed{
\lambda_iw_i
}
$$

经过一个**共同归一化**之后的结果。

所以：

$$
\lambda_i'
\propto\lambda_iw_i.
$$

因此：

$$
\frac{\lambda_i'}{w_i}
\propto\lambda_i.
$$

而“\(\propto\)”最后变成“\(=\)”的方法，就是利用：

$$
\boxed{\sum_i\lambda_i=1}
$$

做归一化。

---

所以你的疑问是完全正确的，而且恰好揭示了这个推导最关键的一步：

> **求和中的 \(\lambda_i\) 从来没有被忽略；它被封装成一个对所有 \(i\) 相同的比例因子，然后利用重心坐标的归一化条件把这个比例因子消掉。**
