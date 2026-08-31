Bézier 曲线

```js
for (let alpha = 0.0; alpha < 1.0; alpha += step) {
  for (let beta = 0.0; beta < 1.0 - alpha; beta += step) {
    let gamma = 1 - alpha - beta;
  }
}
```
