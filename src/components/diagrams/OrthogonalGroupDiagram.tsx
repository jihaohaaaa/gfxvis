import InlineMath from "../framework/InlineMath";

export default function OrthogonalGroupDiagram() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            三维正交群 O(3) 与特殊正交群 SO(3) 群结构分类
          </span>
        </div>
        <span className="rounded-md bg-surface-hover px-2 py-0.5 font-mono text-[11px] text-muted">
          det(Q) = ±1
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-center">
        {/* Left: Parent Group O(3) */}
        <div className="md:col-span-4 rounded-xl border border-border/80 bg-surface p-4 text-center">
          <div className="inline-block rounded-md bg-accent/15 px-3 py-1 font-mono text-sm font-bold text-accent">
            正交群 O(3)
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">
            所有满足 <code className="font-mono text-accent">QᵀQ = I</code>{" "}
            的保距变换
          </p>
          <div className="mt-2 text-[11px] text-muted leading-relaxed">
            保持向量长度与夹角内积严格不变（保范数 Isometry）
          </div>
        </div>

        {/* Middle: Split Divider Arrow */}
        <div className="md:col-span-1 flex md:flex-col items-center justify-center text-muted font-bold text-lg">
          <span className="hidden md:inline">➔</span>
          <span className="md:hidden">⬇</span>
        </div>

        {/* Right: Subgroups SO(3) vs Reflection */}
        <div className="md:col-span-7 space-y-3">
          {/* det = +1 */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 transition-colors hover:border-emerald-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-500">
                  det(Q) = +1
                </span>
                <span className="text-xs font-semibold text-foreground">
                  特殊正交群 SO(3)
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-500">
                纯物理刚体旋转
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              <strong>保持空间手征性（Orientation-preserving）</strong>
              ：右手系变换后仍为右手系，空间无镜像畸变，是计算机图形学与动力学旋转的数学载体。
            </p>
          </div>

          {/* det = -1 */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3.5 transition-colors hover:border-red-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-xs font-bold text-red-500">
                  det(Q) = -1
                </span>
                <span className="text-xs font-semibold text-foreground">
                  反射 / 旋转反射
                </span>
              </div>
              <span className="text-[11px] font-medium text-red-500">
                包含镜像翻转
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              <strong>翻转空间手征性（Orientation-reversing）</strong>
              ：如镜像对称变换{" "}
              <InlineMath tex="M_x = \operatorname{diag}(-1, 1, 1)" />
              ，会将右手坐标系镜像翻转为左手系。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
