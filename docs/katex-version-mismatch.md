# KaTeX 数学渲染:版本错配与 rehype-katex 移除记录

> 状态:**已解决**。正文公式改由自写插件 `src/plugins/remark-katex.ts` 渲染,
> `rehype-katex` 已从依赖中移除。本文档给后续 agent 说明"为什么",避免把坑踩回去。

## 结论(先看这个)

- **不要重新引入 `rehype-katex`**。它自 2024-08 起停更(最新 7.0.1),且依赖锁定
  `katex: ^0.16.0`——0.x 的 caret 只会解析到 0.16.x,永远用不上项目的 0.18。
- 数学渲染统一走 **`src/plugins/remark-katex.ts`**(remark 插件,直接调用项目的
  `katex` 0.18.2),与 `BaseLayout.astro` 里导入的 `katex/dist/katex.min.css`(0.18.2)
  保持同一版本。
- 唯一原则:**生成公式 HTML 的 katex 与导入的 katex CSS 必须是同一版本**。

## 症状

文章页正文 KaTeX 公式渲染错位,典型:`P^T \neq P` 显示成 `P T /= P`
(斜杠没有叠加到等号上,而是并排出现);转置符号等也被顶乱。

## 根因:渲染器(katex JS)与 CSS(katex)版本错配

正文静态公式此前由 **katex 0.16.47** 生成(via `rehype-katex@7.0.1`,
其依赖声明 `katex: ^0.16.0`),而 `BaseLayout.astro` 里

```ts
import "katex/dist/katex.min.css";
```

导入的是直接依赖 **katex 0.18.2** 的 CSS。

0.18 把内部辅助类全部加了 `katex-` 前缀,导致 0.18.2 的 CSS 规则匹配不上
0.16.47 生成的 HTML:

| 用途         | katex 0.16.x(HTML 类名) | katex 0.18.x(CSS 选择器) |
| ------------ | ----------------------- | ------------------------ |
| 叠加斜杠容器 | `.inner`                | `.katex-inner`           |
| 修复位       | `.fix`                  | `.katex-fix`             |
| 薄盒         | `.thinbox`              | `.katex-thinbox`         |
| 基座         | `.base`                 | `.katex-base`            |
| 撑杆         | `.strut`                | `.katex-strut`           |

关键规则 `.katex .rlap>.inner { position:absolute }`(0.16)在 0.18.2 里变成
`.katex .rlap>.katex-inner`,对 `.inner` 不再生效。于是 `\neq` 的私有区斜杠字形
`\uE020` 没有被绝对定位叠加到 `=` 上,而是以 inline 身份占位 → 视觉上就是 `/=`。

> 注意:**字体文件本身没有问题**。实测 0.16.11 与 0.18.2 的
> `KaTeX_Main-Regular.woff2/.ttf` sha256 完全一致。问题纯粹是 CSS 类名没配上。

## 为什么 CDN 的 katex.min.css "看起来正常"

当时临时用 `<link>` 引入的是 `katex@0.16.11/dist/katex.min.css`——0.16.x 的 CSS,
类名正好匹配 rehype-katex 生成的 0.16.x HTML,所以显示正确。这只是"歪打正着",
不能作为长期方案(项目禁用 CDN、要求本地 npm 依赖)。

## 为什么选择"自写插件"而不是其它方案

| 方案                                        | 结论                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 直接依赖降级到 katex 0.16.47                | 可行但退回旧版;且这只是绕开问题                                                                                |
| pnpm override 强制 rehype-katex 用 0.18.2   | 超出其声明范围(`^0.16.0`),无人测试,风险高                                                                      |
| 换成 rehype-mathjax(MathJax)                | 要换渲染器,与 demo 里 InlineMath 的 KaTeX 视觉不统一                                                           |
| **自写 remark 插件调 katex 0.18.2(已采用)** | rehype-katex 全部实现仅 127 行,核心就是 `katex.renderToString` + 替换节点;自写后渲染器与 CSS 同版本,零停更依赖 |

## 实现方式(现状)

`src/plugins/remark-katex.ts`(`astro.config.ts` 的 `markdown.processor` 中注册):

1. `remark-math` 仍负责把 `$...$` / `$$...$$` 解析成 mdast 的 `inlineMath` / `math` 节点;
2. 自写插件遍历 mdast,对这两类节点调用 `katex.renderToString(value, { displayMode, ... })`;
3. 把节点改写成 `html` 节点(删除 `data.hName/hProperties/hChildren` 等 remark-math 提示),
   让 mdast→hast 桥把它当纯 HTML 输出;
4. 错误兜底:先 `throwOnError: true`,失败则 `file.message(...)` 并用
   `strict: "ignore"` + `throwOnError: false` 重试,再失败输出 `.katex-error` 红字。

`remark-math` 停更(2023-09)但保留:它只是 `$...$` 语法解析层,与 KaTeX 版本无关、
行为稳定;真正会随版本漂移的类名渲染层已被替换。

## 验证方法

- `\neq` 元素宽度应 ≈ 66.8px(出错时是 86.1px);页面 HTML 应含 `katex-inner`
  而非裸 `inner` 类。
- `pnpm build` 29 页零 error;`pnpm lint`、`pnpm format:check` 通过。
