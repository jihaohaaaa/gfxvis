import InlineMath from "../framework/InlineMath";

export default function InvertibleEquivalenceDiagram() {
  const items = [
    {
      title: "行列式非零",
      math: "\\det(A) \\neq 0",
      desc: "体积缩放倍率非零，空间未被压扁为降维子空间",
      tag: "几何体积",
      color: "border-blue-500/40 bg-blue-500/5 text-blue-500",
    },
    {
      title: "满秩矩阵",
      math: "\\operatorname{rank}(A) = n",
      desc: "列空间与行空间均张成完整的全维度空间 ℝⁿ",
      tag: "空间维度",
      color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-500",
    },
    {
      title: "零空间平凡",
      math: "\\ker(A) = \\{\\mathbf{0}\\}",
      desc: "仅零向量映射至零，变换具有单射性无信息塌缩",
      tag: "映射单射",
      color: "border-purple-500/40 bg-purple-500/5 text-purple-500",
    },
    {
      title: "列向量组线性无关",
      math: "\\operatorname{span}(\\mathbf{a}_1..\\mathbf{a}_n) = \\mathbb{R}^n",
      desc: "各列向量指向独立维度，构成空间的一组有效基底",
      tag: "空间基底",
      color: "border-amber-500/40 bg-amber-500/5 text-amber-500",
    },
    {
      title: "方程有唯一解",
      math: "A\\mathbf{x} = \\mathbf{b} \\implies \\mathbf{x} = A^{-1}\\mathbf{b}",
      desc: "对任意目标向量 b，均存在唯一确定初始原像",
      tag: "线性方程",
      color: "border-teal-500/40 bg-teal-500/5 text-teal-500",
    },
    {
      title: "特征值全非零",
      math: "\\lambda_i \\neq 0 \\; (\\forall i)",
      desc: "任何主方向上的伸缩因子均不为 0",
      tag: "谱理论",
      color: "border-rose-500/40 bg-rose-500/5 text-rose-500",
    },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            可逆矩阵等价定理（The Invertible Matrix Theorem）全景图
          </span>
        </div>
        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
          充要条件 ⇔ 逻辑等价
        </span>
      </div>

      {/* Center Root Concept */}
      <div className="mb-5 flex justify-center">
        <div className="relative inline-flex items-center gap-2.5 rounded-xl border-2 border-accent bg-accent/10 px-5 py-2.5 text-sm font-bold text-foreground shadow-xs">
          <span className="text-accent text-base">★</span>
          <span>方阵 A 存在逆矩阵 A⁻¹（Invertible）</span>
          <span className="text-accent text-base">★</span>
        </div>
      </div>

      {/* Grid of Equivalent Conditions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all hover:scale-[1.01] hover:shadow-xs ${item.color}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {idx + 1}. {item.title}
                </span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-90 border border-current">
                  {item.tag}
                </span>
              </div>
              <div className="my-2 rounded bg-background/80 px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground border border-border/50">
                <InlineMath tex={item.math} />
              </div>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
