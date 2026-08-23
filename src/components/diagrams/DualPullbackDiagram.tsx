import React, { useState } from "react";
import InlineMath from "../framework/InlineMath";
import CapsuleTabs from "../framework/CapsuleTabs";
import ParamSlider from "../framework/ParamSlider";

type StepId =
  | "overview"
  | "forward_eval"
  | "pullback_construct"
  | "pullback_eval"
  | "transpose_id";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "overview", label: "1. 全景交换图" },
  { id: "forward_eval", label: "2. 路径一: 前向投射测量" },
  { id: "pullback_construct", label: "3. 对偶拉回 T* 构造" },
  { id: "pullback_eval", label: "4. 路径二: 拉回泛函求值" },
  { id: "transpose_id", label: "5. 标量恒等与矩阵转置" },
];

export default function DualPullbackDiagram() {
  const [activeStep, setActiveStep] = useState<StepId>("overview");

  // Interactive toy parameters for live numerical check
  const [v1, setV1] = useState<number>(2.0);
  const [v2, setV2] = useState<number>(1.0);
  const [y1, setY1] = useState<number>(0.5);
  const [y2, setY2] = useState<number>(1.5);

  // Matrix A = [[1.2, 0.4], [0.3, 0.8]]
  const a11 = 1.2;
  const a12 = 0.4;
  const a21 = 0.3;
  const a22 = 0.8;

  // 1. Forward Path: w = A * v
  const w1 = a11 * v1 + a12 * v2;
  const w2 = a21 * v1 + a22 * v2;
  // Scalar by g(w) = y1 * w1 + y2 * w2
  const scalarForward = y1 * w1 + y2 * w2;

  // 2. Pullback Path: f = A^T * y
  const f1 = a11 * y1 + a21 * y2;
  const f2 = a12 * y1 + a22 * y2;
  // Scalar by f(v) = f1 * v1 + f2 * v2
  const scalarPullback = f1 * v1 + f2 * v2;

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            对偶映射拉回（Pullback）与前向映射交换图
          </span>
        </div>
        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
          逆向伴随数据流
        </span>
      </div>

      {/* Step Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CapsuleTabs
          options={STEPS}
          value={activeStep}
          onChange={(val) => setActiveStep(val as StepId)}
        />
      </div>

      {/* Commutative Diagram Visual Board */}
      <div className="relative rounded-xl border border-border bg-surface p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
          {/* Top-Left: Vector Space V */}
          <div
            className={`flex flex-col items-center rounded-xl border p-4 transition-all duration-300 ${
              activeStep === "overview" ||
              activeStep === "forward_eval" ||
              activeStep === "pullback_eval" ||
              activeStep === "transpose_id"
                ? "border-blue-500/60 bg-blue-500/10 shadow-sm"
                : "border-border bg-surface-hover/30 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between w-full border-b border-blue-500/20 pb-1 mb-2">
              <span className="text-xs font-bold text-blue-500 uppercase">
                输入空间 V
              </span>
              <span className="text-[10px] font-mono text-muted">dim = n</span>
            </div>
            <div className="text-sm font-bold text-foreground my-1">
              <InlineMath tex="\mathbf{v} \in V" />
            </div>
            <span className="text-[11px] text-muted text-center">
              原空间几何向量 / 待测物理对象
            </span>
          </div>

          {/* Top-Right: Vector Space W */}
          <div
            className={`flex flex-col items-center rounded-xl border p-4 transition-all duration-300 ${
              activeStep === "overview" ||
              activeStep === "forward_eval" ||
              activeStep === "pullback_construct" ||
              activeStep === "transpose_id"
                ? "border-purple-500/60 bg-purple-500/10 shadow-sm"
                : "border-border bg-surface-hover/30 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between w-full border-b border-purple-500/20 pb-1 mb-2">
              <span className="text-xs font-bold text-purple-500 uppercase">
                目标空间 W
              </span>
              <span className="text-[10px] font-mono text-muted">dim = m</span>
            </div>
            <div className="text-sm font-bold text-foreground my-1">
              <InlineMath tex="T(\mathbf{v}) \in W \quad \text{与} \quad g \in W^*" />
            </div>
            <span className="text-[11px] text-muted text-center">
              前向映射目标向量 & 目标空间测量泛函
            </span>
          </div>

          {/* Top Horizontal Arrow: Forward T: V -> W */}
          <div className="col-span-1 md:col-span-2 flex items-center justify-center -my-3 z-10">
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-1.5 text-xs font-medium transition-all ${
                activeStep === "forward_eval" || activeStep === "overview"
                  ? "border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shadow-xs scale-105"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span>
                前向线性映射 <InlineMath tex="T: V \to W" /> (矩阵{" "}
                <InlineMath tex="A" />)
              </span>
              <span className="text-base font-bold">➔</span>
            </div>
          </div>

          {/* Reverse Top/Middle Arrow: Pullback T*: W* -> V* */}
          <div className="col-span-1 md:col-span-2 flex items-center justify-center -my-3 z-10">
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-1.5 text-xs font-medium transition-all ${
                activeStep === "pullback_construct" || activeStep === "overview"
                  ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-xs scale-105"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span className="text-base font-bold">⬅</span>
              <span>
                对偶拉回映射 <InlineMath tex="T^*: W^* \to V^*" /> (伴随转置矩阵{" "}
                <InlineMath tex="A^\top" />)
              </span>
            </div>
          </div>

          {/* Bottom-Left: Left Functional Evaluation (T*g)(v) */}
          <div
            className={`flex flex-col items-center rounded-xl border p-4 transition-all duration-300 ${
              activeStep === "pullback_eval" ||
              activeStep === "overview" ||
              activeStep === "transpose_id"
                ? "border-amber-500/60 bg-amber-500/10 shadow-sm"
                : "border-border bg-surface-hover/30 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between w-full border-b border-amber-500/20 pb-1 mb-2">
              <span className="text-xs font-bold text-amber-500 uppercase">
                拉回泛函求值
              </span>
              <span className="text-[10px] font-mono text-muted">
                V* 作用于 V
              </span>
            </div>
            <div className="text-sm font-bold text-foreground my-1">
              <InlineMath tex="(T^*g)(\mathbf{v}) \in \mathbb{R}" />
            </div>
            <span className="text-[11px] text-muted text-center">
              先将探针 g 拉回为 V* 上的泛函 T*g，再测量 v
            </span>
          </div>

          {/* Bottom-Right: Right Functional Evaluation g(Tv) */}
          <div
            className={`flex flex-col items-center rounded-xl border p-4 transition-all duration-300 ${
              activeStep === "forward_eval" ||
              activeStep === "overview" ||
              activeStep === "transpose_id"
                ? "border-purple-500/60 bg-purple-500/10 shadow-sm"
                : "border-border bg-surface-hover/30 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between w-full border-b border-purple-500/20 pb-1 mb-2">
              <span className="text-xs font-bold text-purple-500 uppercase">
                目标泛函直接测量
              </span>
              <span className="text-[10px] font-mono text-muted">
                W* 作用于 W
              </span>
            </div>
            <div className="text-sm font-bold text-foreground my-1">
              <InlineMath tex="g(T(\mathbf{v})) \in \mathbb{R}" />
            </div>
            <span className="text-[11px] text-muted text-center">
              先将向量 v 送入 W 得到 T(v)，再用探针 g 测量
            </span>
          </div>

          {/* Bottom Equivalence Bridge */}
          <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3 text-center">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>● 拉回定义的核心恒等式（Commutative Square）</span>
            </div>
            <div className="my-1.5 text-sm md:text-base font-mono font-bold text-foreground">
              <InlineMath tex="\boxed{(T^*g)(\mathbf{v}) \equiv g(T(\mathbf{v})) \in \mathbb{R}}" />
            </div>
            <span className="text-[11px] text-muted">
              代数矩阵形式：
              <InlineMath tex="(\mathbf{y}^\top A) \mathbf{x} = \mathbf{y}^\top (A \mathbf{x}) = (A^\top \mathbf{y})^\top \mathbf{x}" />
            </span>
          </div>
        </div>
      </div>

      {/* Step Explanation Callout */}
      <div className="rounded-xl border border-border bg-surface p-4 text-xs">
        {activeStep === "overview" && (
          <p className="text-muted leading-relaxed">
            💡 <strong className="text-foreground">交换图总览</strong>：线性映射{" "}
            <InlineMath tex="T" /> 将向量从 <InlineMath tex="V" /> 正向搬运至{" "}
            <InlineMath tex="W" />
            ；对偶空间上的测量探针 <InlineMath tex="g \in W^*" /> 则通过{" "}
            <InlineMath tex="T^*" /> <strong>反向拉回</strong>至{" "}
            <InlineMath tex="V^*" />
            。两条路径最终在实数域 <InlineMath tex="\mathbb{R}" />{" "}
            汇合且结果恒等！
          </p>
        )}
        {activeStep === "forward_eval" && (
          <p className="text-muted leading-relaxed">
            ▶ <strong className="text-blue-500">路径一（前向投射测量）</strong>
            ：先将输入向量 <InlineMath tex="\mathbf{v}" /> 经由变换矩阵{" "}
            <InlineMath tex="A" /> 投影为{" "}
            <InlineMath tex="T(\mathbf{v}) = A\mathbf{v} \in W" />
            ，随后由探针 <InlineMath tex="g" /> 进行测量：
            <InlineMath tex="g(T(\mathbf{v})) = \mathbf{y}^\top (A\mathbf{x})" />
            。
          </p>
        )}
        {activeStep === "pullback_construct" && (
          <p className="text-muted leading-relaxed">
            ◀ <strong className="text-amber-500">对偶拉回机制</strong>：如何用{" "}
            <InlineMath tex="W" /> 上的探针 <InlineMath tex="g" /> 去测量{" "}
            <InlineMath tex="V" /> 中的向量？最自然的定义就是{" "}
            <InlineMath tex="(T^*g)(\mathbf{v}) := g(T(\mathbf{v}))" />
            。拉回操作 <InlineMath tex="T^*" /> 的方向天然与{" "}
            <InlineMath tex="T" /> 相反！
          </p>
        )}
        {activeStep === "pullback_eval" && (
          <p className="text-muted leading-relaxed">
            ▼{" "}
            <strong className="text-amber-600 dark:text-amber-400">
              路径二（拉回泛函求值）
            </strong>
            ：拉回后的探针 <InlineMath tex="T^*g \in V^*" /> 其分量为{" "}
            <InlineMath tex="\mathbf{y}^\top A" />
            （或对偶列向量 <InlineMath tex="A^\top \mathbf{y}" />
            ）。直接将它作用于输入向量 <InlineMath tex="\mathbf{v}" />
            ，即可在无需显式构造 <InlineMath tex="T(\mathbf{v})" />{" "}
            的前提下一步到位完成测量。
          </p>
        )}
        {activeStep === "transpose_id" && (
          <p className="text-muted leading-relaxed">
            ★{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              转置矩阵的泛函本质
            </strong>
            ：在基底展开下，结合律{" "}
            <InlineMath tex="(\mathbf{y}^\top A)\mathbf{x} = \mathbf{y}^\top(A\mathbf{x})" />{" "}
            揭示了**转置矩阵 <InlineMath tex="A^\top" /> 正是对偶拉回映射{" "}
            <InlineMath tex="T^*" /> 的矩阵表示**！
          </p>
        )}
      </div>

      {/* Live Numeric Verification Playground */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 rounded-xl border border-border bg-surface p-4 text-xs">
        {/* Sliders */}
        <div className="space-y-2.5">
          <p className="font-semibold text-foreground">
            交互式数值检验：调节向量 <InlineMath tex="\mathbf{v}" /> 与探针{" "}
            <InlineMath tex="g" />
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ParamSlider
              label="向量 v₁"
              value={v1}
              min={-3}
              max={3}
              step={0.1}
              onChange={setV1}
            />
            <ParamSlider
              label="向量 v₂"
              value={v2}
              min={-3}
              max={3}
              step={0.1}
              onChange={setV2}
            />
            <ParamSlider
              label="探针 g 分量 y₁"
              value={y1}
              min={-3}
              max={3}
              step={0.1}
              onChange={setY1}
            />
            <ParamSlider
              label="探针 g 分量 y₂"
              value={y2}
              min={-3}
              max={3}
              step={0.1}
              onChange={setY2}
            />
          </div>
        </div>

        {/* Real-time Math Output */}
        <div className="flex flex-col justify-between space-y-2 font-mono text-[11px]">
          <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2 space-y-0.5">
            <div className="flex items-center justify-between text-blue-500 font-bold">
              <span>路径一: g(T(v)) = yᵀ (Av)</span>
              <span>= {scalarForward.toFixed(3)}</span>
            </div>
            <p className="text-muted text-[10px]">
              T(v) = ({w1.toFixed(2)}, {w2.toFixed(2)})ᵀ ➔ 测量值{" "}
              {scalarForward.toFixed(3)}
            </p>
          </div>

          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 space-y-0.5">
            <div className="flex items-center justify-between text-amber-500 font-bold">
              <span>路径二: (T*g)(v) = (Aᵀy)ᵀ v</span>
              <span>= {scalarPullback.toFixed(3)}</span>
            </div>
            <p className="text-muted text-[10px]">
              T*g = ({f1.toFixed(2)}, {f2.toFixed(2)}) ➔ 测量值{" "}
              {scalarPullback.toFixed(3)}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
            <span>双路径数值校验：</span>
            <span>
              {Math.abs(scalarForward - scalarPullback) < 1e-4
                ? "✓ 标量测量值严格恒等!"
                : "✕ 校验失败"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
