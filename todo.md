# TODO

度量空间

Bézier 曲线, B-Rep, NURBS

```js
for (let alpha = 0.0; alpha < 1.0; alpha += step) {
  for (let beta = 0.0; beta < 1.0 - alpha; beta += step) {
    let gamma = 1 - alpha - beta;
  }
}
```

类型理论, covariant, contravariant, invariant, C# 的 variance, ts 的 width subtype 和 function variance

名义子类型, 结构子类型, subtype polymorphism, ad-hoc polymorphism, parametric polymorphism, constrained parametric polymorphism, existential type, dependent type

ADT: sum, product, unit, never

<: |- |=

类型构造器

Rust 生命周期与子类型

System F

---

C++ trait 萃取 类型构造器, 特化白名单

template template parameter

---

Lambda Calculus, Church

---

Category = Objects + Morphisms + Morphism composition​ + Identity morphisms

Set category: object -> set, morphism -> function, Morphism composition -> function composition, Identity morphism -> identity function

vector space over field category: object -> vector space, morphism -> linear map, composition -> matrix(linear map) composition, Identity morphism -> identity matrix(identity linear map)

Functor, rust functor example, option vec result map

monoid in set: (M, ★, e) e.g. (Z, +, 0) (string, concat, "") ({f | f: X -> X}, compose , id)

Monoidal Category: Category + ⊗ + I + α + λ + ρ + coherence​

monoid object: (M,μ,η)​ -> M, μ: M ⊗ M → M, η : 1 → M​

endofunctor

natural transformation

category of endofunctors

monoid object in that category

monad

---

Set -> Quiver -> Semicategory -> Category -> Monoidal Category

---

Set -> Magma -> Semigroup -> Monoid -> Group
