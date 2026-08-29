import React, { useState } from "react";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";

const PRESETS: PresetOption[] = [
  {
    value: "symmetric",
    label: "实对称矩阵（特征值 λ=4, 2）",
    description:
      "A = [[3, 1], [1, 3]]，旋转到 45° 特征轴即可相似对角化为 diag(4, 2)",
  },
  {
    value: "shear_triangular",
    label: "三角剪切矩阵（特征值 λ=2, 3）",
    description: "A = [[2, 1], [0, 3]]，存在两个独立特征方向",
  },
  {
    value: "defective",
    label: "亏损矩阵（Jordan 块 λ=2）",
    description: "A = [[2, 1], [0, 2]]，几何重数仅为 1，任意换基均无法对角化",
  },
  {
    value: "rotation_scale",
    label: "伸缩旋转复合（特征值 λ=2±i）",
    description:
      "A = [[2, -1], [1, 2]]，具有复共轭特征值，在实数域内不可对角化",
  },
];

function fmt(n: number): string {
  const v = Math.abs(n) < 1e-4 ? 0 : n;
  return v.toFixed(2);
}

export default function MatrixSimilarityDiagram() {
  const [presetKey, setPresetKey] = useState("symmetric");
  const [thetaDeg, setThetaDeg] = useState<number>(45);
  const [scaleX, setScaleX] = useState<number>(1.0);
  const [scaleY, setScaleY] = useState<number>(1.0);

  // Original matrix A = [[a, b], [c, d]]
  let a = 3,
    b = 1,
    c = 1,
    d = 3;

  if (presetKey === "symmetric") {
    a = 3;
    b = 1;
    c = 1;
    d = 3;
  } else if (presetKey === "shear_triangular") {
    a = 2;
    b = 1;
    c = 0;
    d = 3;
  } else if (presetKey === "defective") {
    a = 2;
    b = 1;
    c = 0;
    d = 2;
  } else if (presetKey === "rotation_scale") {
    a = 2;
    b = -1;
    c = 1;
    d = 2;
  }

  // Change of basis matrix P = R(theta) * S(scaleX, scaleY)
  // P = [[p11, p12], [p21, p22]]
  const rad = (thetaDeg * Math.PI) / 180;
  const cosT = Math.cos(rad);
  const sinT = Math.sin(rad);

  const p11 = cosT * scaleX;
  const p12 = -sinT * scaleY;
  const p21 = sinT * scaleX;
  const p22 = cosT * scaleY;

  const detP = p11 * p22 - p12 * p21 || 1e-5;

  // P^-1 = (1 / detP) * [[p22, -p12], [-p21, p11]]
  const invP11 = p22 / detP;
  const invP12 = -p12 / detP;
  const invP21 = -p21 / detP;
  const invP22 = p11 / detP;

  // Compute B = P^-1 * A * P
  // First, Temp = A * P
  const temp11 = a * p11 + b * p21;
  const temp12 = a * p12 + b * p22;
  const temp21 = c * p11 + d * p21;
  const temp22 = c * p12 + d * p22;

  // Then, B = P^-1 * Temp
  const b11 = invP11 * temp11 + invP12 * temp21;
  const b12 = invP11 * temp12 + invP12 * temp22;
  const b21 = invP21 * temp11 + invP22 * temp21;
  const b22 = invP21 * temp12 + invP22 * temp22;

  // Invariants
  const trA = a + d;
  const trB = b11 + b22;

  const detA = a * d - b * c;
  const detB = b11 * b22 - b12 * b21;

  // Eigenvalues of 2x2: lambda^2 - tr*lambda + det = 0
  const discA = trA * trA - 4 * detA;
  let eigStrA: string;
  if (discA >= 0) {
    const l1 = (trA + Math.sqrt(discA)) / 2;
    const l2 = (trA - Math.sqrt(discA)) / 2;
    eigStrA = `\\lambda_1 = ${fmt(l1)}, \\; \\lambda_2 = ${fmt(l2)}`;
  } else {
    const re = trA / 2;
    const im = Math.sqrt(-discA) / 2;
    eigStrA = `\\lambda_{1,2} = ${fmt(re)} \\pm ${fmt(im)}i`;
  }

  const handlePreset = (val: string) => {
    setPresetKey(val);
    if (val === "symmetric") {
      setThetaDeg(45);
      setScaleX(1.0);
      setScaleY(1.0);
    } else {
      setThetaDeg(0);
      setScaleX(1.0);
      setScaleY(1.0);
    }
  };

  return (
    <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
            矩阵相似（Similarity）与坐标换基交换图
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            调节换基矩阵 <InlineMath tex="P" />{" "}
            的旋转与缩放，实时观察矩阵内部数值 <InlineMath tex="B = P^{-1}AP" />{" "}
            的变动，以及相似不变量的严格守恒
          </p>
        </div>
      </div>

      <div className="mb-5">
        <PresetSelector
          onChange={handlePreset}
          options={PRESETS}
          value={presetKey}
        />
      </div>

      {/* Sliders */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ParamSlider
          display={`${thetaDeg}°`}
          label="基底旋转角 θ"
          max={180}
          min={-180}
          onChange={(v) => setThetaDeg(v)}
          step={1}
          value={thetaDeg}
        />
        <ParamSlider
          label="基向量 1 缩放 s_x"
          max={2.5}
          min={0.5}
          onChange={(v) => setScaleX(v)}
          step={0.1}
          value={scaleX}
        />
        <ParamSlider
          label="基向量 2 缩放 s_y"
          max={2.5}
          min={0.5}
          onChange={(v) => setScaleY(v)}
          step={0.1}
          value={scaleY}
        />
      </div>

      {/* Commutative Diagram & Matrices Display */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Commutative Diagram Visual Card */}
        <div className="flex flex-col justify-between rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20 lg:col-span-6">
          <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
            换基交换图（Commutative Diagram）
          </div>

          <div className="my-4 flex flex-col items-center justify-center gap-3 text-center">
            {/* Top row: Base B */}
            <div className="flex items-center justify-center gap-6">
              <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  原基底 <InlineMath tex="\mathcal{B}" />
                </span>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <InlineMath tex="[\mathbf{v}]_{\mathcal{B}}" />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  <InlineMath tex="\xrightarrow{\quad A \quad}" />
                </span>
                <span className="text-[10px] text-slate-400">线性映射 T</span>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  原基底 <InlineMath tex="\mathcal{B}" />
                </span>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <InlineMath tex="[T(\mathbf{v})]_{\mathcal{B}}" />
                </div>
              </div>
            </div>

            {/* Vertical transitions: P and P^-1 */}
            <div className="flex w-full max-w-[280px] items-center justify-between px-6 text-xs text-slate-400">
              <div className="flex flex-col items-center">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  <InlineMath tex="P \downarrow \uparrow P^{-1}" />
                </span>
              </div>
              <div className="text-[10px] italic text-slate-400">
                坐标系等价映射
              </div>
              <div className="flex flex-col items-center">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  <InlineMath tex="P \downarrow \uparrow P^{-1}" />
                </span>
              </div>
            </div>

            {/* Bottom row: Base C */}
            <div className="flex items-center justify-center gap-6">
              <div className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">
                  新基底 <InlineMath tex="\mathcal{C}" />
                </span>
                <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  <InlineMath tex="[\mathbf{v}]_{\mathcal{C}}" />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <InlineMath tex="\xrightarrow{\quad B = P^{-1}AP \quad}" />
                </span>
                <span className="text-[10px] text-slate-400">相似矩阵 B</span>
              </div>

              <div className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">
                  新基底 <InlineMath tex="\mathcal{C}" />
                </span>
                <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  <InlineMath tex="[T(\mathbf{v})]_{\mathcal{C}}" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded bg-white/70 p-2 text-center text-[11px] text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
            公式闭环：
            <InlineMath tex="[\mathbf{v}]_{\mathcal{C}} \xrightarrow{P} [\mathbf{v}]_{\mathcal{B}} \xrightarrow{A} [T(\mathbf{v})]_{\mathcal{B}} \xrightarrow{P^{-1}} [T(\mathbf{v})]_{\mathcal{C}}" />
          </div>
        </div>

        {/* Right: Real-time Matrices & Invariants */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-6">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            矩阵数值联动与相似不变量探针
          </div>

          <div className="my-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Matrix A */}
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                原基表示矩阵 <InlineMath tex="A" />
              </div>
              <div className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                <InlineMath
                  tex={`A = \\begin{pmatrix} ${fmt(a)} & ${fmt(b)} \\\\ ${fmt(c)} & ${fmt(d)} \\end{pmatrix}`}
                />
              </div>
            </div>

            {/* Matrix P */}
            <div className="rounded-lg bg-amber-50/60 p-2.5 dark:bg-amber-950/20">
              <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                换基矩阵 <InlineMath tex="P" /> (det={fmt(detP)})
              </div>
              <div className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                <InlineMath
                  tex={`P = \\begin{pmatrix} ${fmt(p11)} & ${fmt(p12)} \\\\ ${fmt(p21)} & ${fmt(p22)} \\end{pmatrix}`}
                />
              </div>
            </div>

            {/* Matrix B */}
            <div className="rounded-lg bg-emerald-50/60 p-2.5 sm:col-span-2 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span>
                  新基表示矩阵 <InlineMath tex="B = P^{-1}AP" />
                </span>
                {Math.abs(b12) < 1e-3 && Math.abs(b21) < 1e-3 && (
                  <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                    已对角化！
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                <InlineMath
                  tex={`B = \\begin{pmatrix} ${fmt(b11)} & ${fmt(b12)} \\\\ ${fmt(b21)} & ${fmt(b22)} \\end{pmatrix}`}
                />
              </div>
            </div>
          </div>

          {/* Invariants Probe Badge Card */}
          <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/30 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="mb-1 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
              相似不变量（严格恒等守恒）
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between rounded bg-white px-2 py-1 dark:bg-slate-900">
                <span className="text-slate-500">迹 tr</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  <InlineMath
                    tex={`\\operatorname{tr}(A)=${fmt(trA)}, \\; \\operatorname{tr}(B)=${fmt(trB)}`}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-white px-2 py-1 dark:bg-slate-900">
                <span className="text-slate-500">行列式 det</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  <InlineMath
                    tex={`\\det(A)=${fmt(detA)}, \\; \\det(B)=${fmt(detB)}`}
                  />
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">
              <span className="text-slate-500">特征值谱</span>
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                <InlineMath tex={eigStrA} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
