import InlineMath from "../framework/InlineMath";

export default function InverseTransformDiagram() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            几何撤销模型：前向变换与时空倒流还原
          </span>
        </div>
        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
          可逆闭环映射
        </span>
      </div>

      {/* Main Cycle Flow */}
      <div className="flex flex-col items-center justify-between gap-4 py-2 sm:flex-row sm:gap-6">
        {/* State X */}
        <div className="flex flex-1 flex-col items-center rounded-xl border border-blue-500/40 bg-blue-500/5 p-4 text-center">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">
            初始几何空间
          </span>
          <div className="my-2 text-base font-bold text-foreground">
            <InlineMath tex="\mathbf{x} \in \mathbb{R}^n" />
          </div>
          <span className="text-[11px] text-muted">原始点坐标与网格</span>
        </div>

        {/* Center Arrows & Identity */}
        <div className="flex flex-col items-center justify-center gap-2.5 px-2">
          {/* Forward */}
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            <span>
              前向变换矩阵 <InlineMath tex="A" /> (拉伸 / 旋转 / 剪切)
            </span>
            <span className="text-sm font-bold">➔</span>
          </div>

          {/* Central Property */}
          <div className="rounded-md bg-surface px-3 py-0.5 font-mono text-xs font-bold text-foreground border border-border/60 shadow-2xs">
            <InlineMath tex="A^{-1}A = AA^{-1} = I" />
          </div>

          {/* Backward */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500">
            <span className="text-sm font-bold">⬅</span>
            <span>
              逆矩阵 <InlineMath tex="A^{-1}" /> (撤销 / 还原 / 倒流)
            </span>
          </div>
        </div>

        {/* State Y */}
        <div className="flex flex-1 flex-col items-center rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 text-center">
          <span className="text-xs font-bold text-purple-500 uppercase tracking-wide">
            变换后空间
          </span>
          <div className="my-2 text-base font-bold text-foreground">
            <InlineMath tex="\mathbf{y} = A\mathbf{x}" />
          </div>
          <span className="text-[11px] text-muted">形变 / 旋转后的目标点</span>
        </div>
      </div>
    </div>
  );
}
