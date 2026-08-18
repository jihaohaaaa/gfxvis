import InlineMath from "../framework/InlineMath";

export default function DegreesOfFreedomDiagram() {
  const cards = [
    {
      title: "3×3 旋转矩阵 (SO(3) / mat3)",
      params: "9 个参数",
      constraints: "6 个约束 + det=1",
      dof: "3 自由度 (DoF)",
      badgeColor: "bg-blue-500/15 text-blue-500 border-blue-500/40",
      accent: "border-blue-500/40",
      detail: (
        <>
          <div className="space-y-1 text-[11px] text-muted leading-relaxed">
            <p>
              • <strong>参数量</strong>：
              <code className="font-mono text-foreground">9</code> 个浮点数（36
              字节）。
            </p>
            <p>
              • <strong>代数约束</strong>：3 个列向量单位长度（
              <InlineMath tex="\|\mathbf{c}_i\|=1" />
              ）+ 3 个列向量两两正交（
              <InlineMath tex="\mathbf{c}_i \cdot \mathbf{c}_j = 0" />
              ）+ 行列式为 <InlineMath tex="+1" />。
            </p>
            <p>
              • <strong>自由度计算</strong>：<InlineMath tex="9 - 6 = 3" />。
            </p>
            <p>
              • <strong>优缺点</strong>
              ：图形管线向量变换极速，但内存占用大、矩阵相乘易累积舍入误差发生正交漂移，无法直接平滑插值。
            </p>
          </div>
        </>
      ),
    },
    {
      title: "单位四元数 (Unit Quaternion / 𝕊³)",
      params: "4 个参数",
      constraints: "1 个单位模长约束",
      dof: "3 自由度 (DoF)",
      badgeColor: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
      accent: "border-emerald-500/50 bg-emerald-500/[0.02]",
      featured: true,
      detail: (
        <>
          <div className="space-y-1 text-[11px] text-muted leading-relaxed">
            <p>
              • <strong>参数量</strong>：
              <code className="font-mono text-foreground">4</code> 个浮点数（16
              字节，节省 55% 显存）。
            </p>
            <p>
              • <strong>代数约束</strong>：仅 1 个超球面单位模长约束（
              <InlineMath tex="w^2+x^2+y^2+z^2 = 1" />
              ）。
            </p>
            <p>
              • <strong>自由度计算</strong>：<InlineMath tex="4 - 1 = 3" />。
            </p>
            <p>
              • <strong>优缺点</strong>
              ：紧凑高效、无万向节死锁、数值归一化极快（仅需除以标量范数），天生支持
              SLERP 球面恒角速平滑插值。
            </p>
          </div>
        </>
      ),
    },
    {
      title: "经典欧拉角 (Euler Angles / vec3)",
      params: "3 个参数",
      constraints: "0 个代数约束",
      dof: "3 自由度 (DoF)",
      badgeColor: "bg-amber-500/15 text-amber-500 border-amber-500/40",
      accent: "border-amber-500/40",
      detail: (
        <>
          <div className="space-y-1 text-[11px] text-muted leading-relaxed">
            <p>
              • <strong>参数量</strong>：
              <code className="font-mono text-foreground">3</code> 个角度（Yaw,
              Pitch, Roll）。
            </p>
            <p>
              • <strong>代数约束</strong>
              ：参数量等于空间自由度，无冗余代数约束。
            </p>
            <p>
              • <strong>自由度计算</strong>：<InlineMath tex="3 - 0 = 3" />。
            </p>
            <p>
              • <strong>优缺点</strong>
              ：最符合人类直觉认知，但存在万向节死锁（Gimbal Lock 奇异点丢失 1
              自由度），且旋转顺序相关、插值严重非各向同性。
            </p>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            三维旋转三大数学表象体系与自由度（DoF）全景对比
          </span>
        </div>
        <span className="rounded-md bg-surface-hover px-2 py-0.5 font-mono text-[11px] text-muted">
          3D Rotation DoF = 3
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`flex flex-col justify-between rounded-xl border bg-surface p-4 transition-all hover:shadow-xs ${c.accent} relative`}
          >
            {c.featured && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2 py-0.5 font-sans text-[10px] font-bold text-white shadow-xs">
                图形学黄金标准
              </span>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">
                  {c.title}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${c.badgeColor}`}
                >
                  {c.dof}
                </span>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 font-mono text-[11px] border border-border/50">
                <span className="text-muted">参数:</span>
                <span className="font-semibold text-foreground">
                  {c.params}
                </span>
                <span className="text-muted">|</span>
                <span className="text-muted">约束:</span>
                <span className="font-semibold text-accent">
                  {c.constraints}
                </span>
              </div>

              {c.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
