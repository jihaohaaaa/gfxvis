import React from "react";
import katex from "katex";

const mathCache = new Map<string, string>();

/**
 * 缓存渲染 KaTeX 字符串为 HTML
 */
export function renderKaTeXToString(tex: string, displayMode = false): string {
  const cacheKey = (displayMode ? "D:" : "I:") + tex;
  const cached = mathCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const rendered = katex.renderToString(tex, {
      throwOnError: false,
      displayMode,
      output: "html",
    });
    mathCache.set(cacheKey, rendered);
    return rendered;
  } catch {
    return tex;
  }
}

/**
 * 匹配 $$...$$ (块级公式)、$...$ (行内公式) 以及 \$ (转义美元符号)
 */
const MATH_TOKEN_REGEX = /(\$\$[\s\S]+?\$\$|\$(?!\$)(?:\\\$|[^$])+\$|\\\$)/g;

/**
 * 将含有 $...$ 或 $$...$$ 的文本字符串解析为包含纯文本与 KaTeX HTML 节点的 React 数组
 */
export function parseMathText(
  text: string,
  keyPrefix = "math",
): React.ReactNode[] {
  if (!text || (!text.includes("$") && !text.includes("\\$"))) {
    return [text];
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MATH_TOKEN_REGEX.lastIndex = 0;

  while ((match = MATH_TOKEN_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchStr = match[0];

    // 匹配项之前的普通纯文本
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }
    lastIndex = matchStart + matchStr.length;

    // 1. 转义的美元符号 \$ -> 还原为字面量 $
    if (matchStr === "\\$") {
      parts.push("$");
      continue;
    }

    // 2. 块级公式 $$...$$
    if (
      matchStr.startsWith("$$") &&
      matchStr.endsWith("$$") &&
      matchStr.length >= 4
    ) {
      const tex = matchStr.slice(2, -2).trim();
      const html = renderKaTeXToString(tex, true);
      parts.push(
        <span
          key={`${keyPrefix}-block-${matchStart}`}
          className="inline-block"
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
      continue;
    }

    // 3. 行内公式 $...$
    if (
      matchStr.startsWith("$") &&
      matchStr.endsWith("$") &&
      matchStr.length >= 2
    ) {
      const tex = matchStr.slice(1, -1).trim();
      const html = renderKaTeXToString(tex, false);
      parts.push(
        <span
          key={`${keyPrefix}-inline-${matchStart}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
      continue;
    }

    // 兜底：未识别则作为普通文本
    parts.push(matchStr);
  }

  // 剩余末尾文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

const SKIP_TAGS = new Set(["code", "pre", "script", "style", "svg", "math"]);

/**
 * 递归遍历并转换 React 子节点中的纯文本为 KaTeX 节点
 */
export function transformMathChildren(
  children: React.ReactNode,
  keyPrefix = "am",
): React.ReactNode {
  if (typeof children === "string") {
    const parsed = parseMathText(children, keyPrefix);
    return parsed.length === 1 ? parsed[0] : parsed;
  }

  if (
    typeof children === "number" ||
    typeof children === "boolean" ||
    children === null ||
    children === undefined
  ) {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child, index) =>
      transformMathChildren(child, `${keyPrefix}-${index}`),
    );
  }

  if (React.isValidElement(children)) {
    // 忽略特定标签或带有 data-no-math 属性的容器
    const type = children.type;
    const props = (children.props || {}) as Record<string, unknown>;
    if (
      (typeof type === "string" && SKIP_TAGS.has(type.toLowerCase())) ||
      Boolean(props["data-no-math"])
    ) {
      return children;
    }

    let hasChanges = false;
    const newProps: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      if (
        key === "key" ||
        key === "ref" ||
        typeof value === "function" ||
        key.startsWith("on")
      ) {
        continue;
      }
      if (
        key === "children" ||
        (value &&
          (typeof value === "string" ||
            React.isValidElement(value) ||
            Array.isArray(value)))
      ) {
        const transformedVal = transformMathChildren(
          value as React.ReactNode,
          `${keyPrefix}-${key}`,
        );
        if (transformedVal !== value) {
          newProps[key] = transformedVal;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      const elementWithRef = children as { ref?: unknown };
      if (elementWithRef.ref !== undefined && newProps.ref === undefined) {
        newProps.ref = elementWithRef.ref;
      }
      return React.cloneElement(
        children,
        newProps as Partial<Record<string, unknown>>,
      );
    }
  }

  return children;
}

export interface AutoMathProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /**
   * 兼容直接传 tex 字符串的模式
   */
  tex?: string;
  /**
   * 是否以块级公式展示 (仅当传入 tex 属性时有效)
   */
  displayMode?: boolean;
  /**
   * 自定义外层渲染标签 (如 "div", "p", "span")。若不指定且无 HTML 属性，则默认以 Fragment 渲染，不增加多余 DOM 层级
   */
  as?: React.ElementType;
}

/**
 * 自动 LaTeX 渲染包装器
 *
 * 功能：
 * 1. 自动识别子内容中的 `$公式$` 与 `$$块级公式$$` 并渲染为 KaTeX；
 * 2. 支持 `\$` 转义为普通美元符号；
 * 3. 内置全局 LRU / Map 缓存，60FPS 高频重渲染时零额外开销；
 * 4. 支持嵌套结构自动递归解析，无需手动切割文本与繁琐公式组件；
 * 5. 兼容直接传入 `tex` 属性的单公式模式。
 *
 * @example
 * ```tsx
 * // 1. 自然包裹带公式的文本段落
 * <AutoMath>设点 $P \in \operatorname{aff}(S)$，当 $\dim = 2$ 且 $\lambda_i \ge 0$ 时成立。</AutoMath>
 *
 * // 2. 包装包含多层子标签的卡片容器
 * <AutoMath as="div" className="p-3 bg-surface border rounded">
 *   <h4>重心坐标定理</h4>
 *   <p>满足 $\sum \lambda_i = 1$。</p>
 * </AutoMath>
 *
 * // 3. 动态数据模板
 * <AutoMath>{`实时坐标：$P = (${x.toFixed(2)}, ${y.toFixed(2)})$`}</AutoMath>
 * ```
 */
export function AutoMath({
  children,
  tex,
  displayMode = false,
  as: Component,
  className,
  style,
  ...rest
}: AutoMathProps) {
  // 1. 如果显式指定了 tex 属性，直接按单公式渲染
  if (typeof tex === "string") {
    const html = renderKaTeXToString(tex, displayMode);
    if (Component) {
      return (
        <Component
          className={className}
          style={style}
          dangerouslySetInnerHTML={{ __html: html }}
          {...rest}
        />
      );
    }
    return (
      <span
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
    );
  }

  // 2. 自动解析 children
  const transformed = transformMathChildren(children);

  // 如果指定了包装标签或传入了 className/style 等 DOM 属性，则输出外层容器
  if (Component) {
    return (
      <Component className={className} style={style} {...rest}>
        {transformed}
      </Component>
    );
  }

  if (
    className !== undefined ||
    style !== undefined ||
    Object.keys(rest).length > 0
  ) {
    return (
      <span className={className} style={style} {...rest}>
        {transformed}
      </span>
    );
  }

  // 无额外属性时，直接以 Fragment 输出，零多余 DOM
  return <>{transformed}</>;
}

/**
 * 高阶组件 (HOC): 为任意 Island 组件包裹单一顶层 AutoMath 自动数学公式渲染能力
 *
 * @example
 * export default withAutoMath(function MyIsland() {
 *   return <div>满足 $\sum \lambda_i = 1$</div>;
 * });
 */
export function withAutoMath<P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <AutoMath>
        <Component {...props} />
      </AutoMath>
    );
  };
  WrappedComponent.displayName = `withAutoMath(${Component.displayName || Component.name || "Component"})`;
  return WrappedComponent;
}

// 导出易记的短别名
export { AutoMath as Math, AutoMath as M };
export default AutoMath;
