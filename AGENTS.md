# AGENTS.md

GFXVis:本地托管的图形学/可视化技术博客(Astro 静态输出 + MDX + KaTeX + Shiki + Tailwind CSS v4 + React/Three.js)。

## 项目规则

- **可视化约定**:实现或修改可视化前先读 `docs/conventions.md`(坐标系与 `mathToWorld` 映射、方向与符号、记号与命名、渲染与交互约定)。
- **KaTeX 数学渲染**:正文公式由自写插件 `src/plugins/remark-katex.ts` 渲染(直接调用 katex 0.18.2),与 `BaseLayout.astro` 导入的 `katex/dist/katex.min.css` 同版本。**不要重新引入 `rehype-katex`**——它已停更且锁定 `katex ^0.16.0`,曾因类名与 0.18 CSS 不匹配导致 `≠` 显示成 `/=`。详见 `docs/katex-version-mismatch.md`。
- **TypeScript 优先**:所有支持 TypeScript 的文件必须使用 `.ts` / `.tsx`,不允许 `.js` / `.mjs` / `.cjs` 变体。
  - 配置文件同样适用:`astro.config.ts`、`eslint.config.ts`、`prettier.config.ts`(不得写成 `.mjs` / `.js`)。
  - 例外:无 TS 形态的格式(JSON/YAML/纯文本,如 `package.json`、`tsconfig.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.gitignore`、`.prettierignore`),以及 `.astro`、`.mdx`、`.css` 等框架/内容/样式文件。

## 常用命令

- `pnpm dev` — 本地开发
- `pnpm build` — 静态构建到 `dist/`
- `pnpm lint` — ESLint 检查
- `pnpm format` / `pnpm format:check` — Prettier 格式化 / 校验
