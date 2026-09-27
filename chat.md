如果你要的是**最终可以拿来描述 Rust 借用检查的形式化模型**，我建议不要停留在单纯的 \(R/W\)。可以收敛成下面这个形式。

## 1. 一个访问事件

先定义一个访问：

$$
A=(p,\alpha,\ell)
$$

其中：

- \(p\)：**place**，例如 \(x,\ x.0,\ *r,\ x[i]\)
- \(\alpha\)：访问权限
- \(\ell\)：该访问有效的生命周期区间

权限定义为：

$$
\alpha\in\{R,W\}
$$

其中：

$$
R=\text{shared/read}
$$

$$
W=\text{exclusive/write}
$$

---

## 2. 两个访问什么时候冲突？

设：

$$
A_1=(p_1,\alpha_1,\ell_1)
$$

$$
A_2=(p_2,\alpha_2,\ell_2)
$$

它们冲突需要同时满足三个条件：

### 条件一：访问的 place 冲突

$$
p_1\sim p_2
$$

这里的 \(\sim\) 表示两个 place 可能指向同一存储位置。

例如：

$$
x.0\not\sim x.1
$$

所以：

$$
W(x.0)\parallel W(x.1)
$$

可以共存。

---

### 条件二：生命周期重叠

$$
\ell_1\cap\ell_2\neq\varnothing
$$

---

### 条件三：权限发生冲突

定义：

$$
\operatorname{conflict}(\alpha_1,\alpha_2)
$$

满足：

$$
\operatorname{conflict}(R,R)=\mathrm{false}
$$

$$
\operatorname{conflict}(R,W)=\mathrm{true}
$$

$$
\operatorname{conflict}(W,R)=\mathrm{true}
$$

$$
\operatorname{conflict}(W,W)=\mathrm{true}
$$

因此最终：

$$
\boxed{
A_1\bowtie A_2
\iff
(p_1\sim p_2)
\land
(\ell_1\cap\ell_2\neq\varnothing)
\land
\operatorname{conflict}(\alpha_1,\alpha_2)
}
$$

**Borrow checker 的核心就是禁止存在这样的冲突访问。**

---

# 3. 但 `&mut` 不能只表示成 \(W\)

这是整个形式化里最容易混淆的地方。

对于：

$$
\&T
$$

可以表示为：

$$
\operatorname{Shared}(T)
$$

其允许：

$$
R
$$

而：

$$
\&mut T
$$

更准确地表示为：

$$
\operatorname{Unique}(T)
$$

它拥有：

$$
R+W
$$

但是是**排他的**：

$$
\operatorname{Unique}(T)
\Rightarrow
\text{不存在其他 overlapping access to }T
$$

所以：

```rust
let x: &mut T = ...;
```

不是简单的：

$$
x:W
$$

而是：

$$
\boxed{x:\operatorname{Unique}(T)}
$$

它可以产生：

$$
W
$$

也可以产生临时的：

$$
R
$$

例如：

```rust
let x: &mut i32 = ...;
let y: &i32 = x;
```

可以理解成：

$$
\operatorname{Unique}(x)
\overset{\text{reborrow}}{\longrightarrow}
\operatorname{Shared}(y)
$$

在 \(y\) 的 lifetime 内，原来的 unique access 被暂时冻结。

---

# 4. 因此整个模型可以压缩成

我建议你以后脑子里用这个：

$$
\boxed{
\text{Borrow}
=
(\text{Place},\text{Permission},\text{Lifetime})
}
$$

其中：

$$
\boxed{
\text{Place}
+
\{R,W\}
+
\text{Lifetime}
}
$$

决定了访问是否合法。

再加上：

$$
\boxed{
\text{Alias/Place relation}
}
$$

决定两个访问是不是冲突。

---

## 5. 和 Rust 类型对应起来

可以建立这个对应：

| Rust            | 形式化                    |
| --------------- | ------------------------- |
| `&T`            | `Shared(T)`               |
| `&mut T`        | `Unique(T)`               |
| `*r` 读取       | \(R(p)\)                  |
| `*r = v`        | \(W(p)\)                  |
| lifetime        | \(\ell\)                  |
| `x.0`, `x.1`    | 不同 place                |
| reborrow        | permission 的临时重新借出 |
| borrow conflict | 两个访问满足 \(\bowtie\)  |

于是：

```rust
let a = &x;
let b = &x;
```

就是：

$$
R(x,[t_1,t_3])
$$

$$
R(x,[t_2,t_4])
$$

允许。

而：

```rust
let a = &x;
let b = &mut x;
```

就是：

$$
R(x,[t_1,t_3])
$$

$$
W(x,[t_2,t_4])
$$

如果：

$$
[t_1,t_3]\cap[t_2,t_4]\neq\varnothing
$$

则：

$$
R\bowtie W
$$

拒绝。

---

### 最终一句话

如果你是在寻找一个**跨语言类型抽象**，而不是要复刻 Rust 编译器的 MIR borrow checker，那么最值得记住的是：

$$
\boxed{
\text{Borrowing}
\approx
\text{Place}
+
\text{Access Permission}
+
\text{Lifetime}
+
\text{Aliasing}
}
$$

其中 \(R/W\) 只是 **Access Permission 的最底层二值模型**，不是完整的 Rust borrow model。
