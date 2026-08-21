import katex from "katex";

interface Props {
  tex: string;
}

/**
 * Render inline KaTeX from a TeX string. Pure and SSR-safe.
 *
 * ⚠️ 【重要转义约定与防坑指南】:
 * 1. 静态字符串属性（JSX 双引号属性 `tex="..."`）：
 *    - JSX 属性中的字符串字面量不会被 JS 编译器做字符转义，请直接使用**单个反斜杠**：
 *    - ✅ 正确：`<InlineMath tex="\mathbb{R}^3" />`、`<InlineMath tex="\mathbf{b}" />`
 *    - ❌ 错误：`<InlineMath tex="\\mathbb{R}^3" />`
 *      （传入 KaTeX 的是两个字面反斜杠 `\\`，会被 KaTeX 识别为换行符，导致后续宏名变成纯文本 `mathbbR^3` 或引发语法报错）
 *
 * 2. 动态模板字符串或 JS 表达式（`tex={`...`}` / `tex={'...'}`）：
 *    - JS 字符串会先经过 JS 引擎的转义，因此需要写**双反斜杠**：
 *    - ✅ 正确：`<InlineMath tex={`\\hat{\\mathbf{x}} = ${val}`} />`
 *    - 矩阵换行在模板字符串中需要写四个反斜杠 `\\\\`。
 */
export default function InlineMath({ tex }: Props) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: false,
    output: "html",
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
