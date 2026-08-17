# GFXVis

本地托管的图形学 / 可视化技术博客。静态站点 + 交互式 3D 示例。

## 技术栈

- Astro(静态输出)+ TypeScript
- MDX + KaTeX + Shiki
- Tailwind CSS v4
- React Islands + Three.js

## 常用命令

```bash
pnpm install   # 安装依赖
pnpm dev       # 本地开发 http://localhost:51730
pnpm build     # 静态构建到 dist/
pnpm preview   # 预览构建产物 http://localhost:51730
pnpm lint      # ESLint 检查
pnpm format    # Prettier 格式化
```

## 写文章

1. 在 `src/content/posts/` 下新建 `xxx.mdx`,可按 `graphics/`、`vulkan/` 分子目录
2. frontmatter 必须包含 `title`、`description`、`date`、`tags`(`draft: true` 可隐藏未完成文章)
3. 数学公式用 KaTeX:`$$ ... $$`;代码块自动 Shiki 高亮
4. 需要交互可视化时引入 React island,例如 `<NormalMatrixDemo client:visible />`

## 3D 示例

- `src/visualizations/core/`: Three.js / Canvas 2D 核心算法与绘制封装
- `src/visualizations/demos/<name>/`: 每个 Demo 的数学与场景配置
- `src/components/framework/`: 框架 UI 控件与 Hook 基础设施 (ExpandableDemo / PresetSelector / useCanvas2D / useVectorDrag 等)
- `src/components/demos/`: 可视化 Demo React Islands

模型文件放在 `public/models/`(如 `bunny.glb`、`helmet.glb`)。
