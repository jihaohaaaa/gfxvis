# AGENTS.md

GFXVis:本地托管的图形学/可视化技术博客(Astro 静态输出 + MDX + KaTeX + Shiki + Tailwind CSS v4 + React/Three.js)。

## 项目规则

- **可视化约定**:实现或修改可视化前先读 `docs/conventions.md`(坐标系与 `mathToWorld` 映射、方向与符号、记号与命名、渲染与交互约定)。
  - **CanvasToolbar 放置与 UI 重叠防护**: `<CanvasToolbar>` **必须且只能**放置在 Canvas 画布容器（必须含 `relative overflow-hidden`）内部作为直接子元素，严禁放在外层 Flex/卡片容器；画布容器高度必须使用 `h-[var(--demo-height,28rem)]`（2D 为 `20rem`）；严禁在外部重复实现复位/关闭按钮。
- **KaTeX 数学渲染**:正文公式由自写插件 `src/plugins/remark-katex.ts` 渲染(直接调用 katex 0.18.2),与 `BaseLayout.astro` 导入的 `katex/dist/katex.min.css` 同版本。**不要重新引入 `rehype-katex`**——它已停更且锁定 `katex ^0.16.0`,曾因类名与 0.18 CSS 不匹配导致 `≠` 显示成 `/=`。详见 `docs/katex-version-mismatch.md`。
  - **InlineMath 转义规则**: JSX 中使用 `<InlineMath tex="..." />` 时：
    - **静态字符串属性(双引号)**: 必须使用**单个反斜杠**（如 `tex="\mathbb{R}^3"`、`tex="\mathbf{b}"`），**严禁写成双反斜杠 `tex="\\..."`**（JSX 静态双引号属性不会转义反斜杠，`\\` 会被 KaTeX 解析为换行符导致公式破坏/报错）。
    - **模板字符串/JS表达式(`{...}`)**: 按 JS 规则使用**双反斜杠**（如 ``tex={`\\hat{\\mathbf{x}} = ${val}`}``，矩阵换行使用 `\\\\`）。
- **MDX 排版**:写文章时 `**...**` 加粗**两侧都加空格、保持对称**(紧贴中文会被 CommonMark 误配,渲染成字面 `**` 或加粗错位;`**` 内也不要包中文引号);**中文语句用全角标点**(`,;:?!` → `，；：？！`、引号用 `“”`),公式/代码/Markdown 链接保持英文标点。详见 `docs/conventions.md`"记号与命名"。
- **TypeScript 优先**:所有支持 TypeScript 的文件必须使用 `.ts` / `.tsx`,不允许 `.js` / `.mjs` / `.cjs` 变体。
  - 配置文件同样适用:`astro.config.ts`、`eslint.config.ts`、`prettier.config.ts`(不得写成 `.mjs` / `.js`)。
  - 例外:无 TS 形态的格式(JSON/YAML/纯文本,如 `package.json`、`tsconfig.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.gitignore`、`.prettierignore`),以及 `.astro`、`.mdx`、`.css` 等框架/内容/样式文件。

## 常用命令

- `pnpm dev` — 本地开发
- `pnpm build` — 静态构建到 `dist/`
- `pnpm lint` — ESLint 检查
- `pnpm format` / `pnpm format:check` — Prettier 格式化 / 校验
