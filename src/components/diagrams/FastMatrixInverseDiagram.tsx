import InlineMath from "../framework/InlineMath";

export default function FastMatrixInverseDiagram() {
  const cards = [
    {
      title: "正交矩阵 (Orthogonal)",
      formula: "Q^{-1} = Q^\\top",
      detail: "列向量组构成标准正交基（如纯旋转 R、反射矩阵）",
      perf: "O(1) 内存转置",
      perfColor: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
      accent: "border-blue-500/40",
    },
    {
      title: "对角矩阵 (Diagonal)",
      formula: "D^{-1} = \\operatorname{diag}(1/d_1, \\ldots, 1/d_n)",
      detail: "所有主对角线元素直接取乘法倒数（要求 dᵢ ≠ 0）",
      perf: "O(n) 线性倒数",
      perfColor: "bg-blue-500/15 text-blue-500 border-blue-500/40",
      accent: "border-purple-500/40",
    },
    {
      title: "刚体/仿射变换 (Rigid TRS)",
      formula: "M^{-1} = R^\\top \\cdot T(-\\mathbf{t})",
      detail: "将平移与旋转逆变换解析复合，无需通用矩阵消元",
      perf: "O(1) 解析展开",
      perfColor: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
      accent: "border-accent/40",
    },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            图形学与工程实践：特殊矩阵极速解析求逆
          </span>
        </div>
        <span className="rounded-md bg-surface-hover px-2 py-0.5 font-mono text-[11px] text-muted">
          告别 O(n³) 高斯消元
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`flex flex-col justify-between rounded-xl border bg-surface p-4 transition-all hover:shadow-xs ${c.accent}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {c.title}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${c.perfColor}`}
                >
                  {c.perf}
                </span>
              </div>
              <div className="my-3 rounded-lg bg-background/90 p-2 text-center font-mono text-xs font-bold text-accent border border-border/60">
                <InlineMath tex={c.formula} />
              </div>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
