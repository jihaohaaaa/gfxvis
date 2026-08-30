import React, { useState } from "react";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";

const PRESETS: PresetOption[] = [
  {
    value: "parabola",
    label: "二次抛物线 p(x) = 2 - 3x + x²",
    description: "具有非零最高次项，导数为一次多项式 p'(x) = -3 + 2x",
  },
  {
    value: "linear",
    label: "一次直线 p(x) = 4 + 2x",
    description: "无二次项，导数为非零常数 p'(x) = 2",
  },
  {
    value: "constant",
    label: "常数多项式 p(x) = 5",
    description: "处于微分算子的核空间中 ker(D)，导数为零多项式 0",
  },
  {
    value: "custom",
    label: "自定义系数",
    description: "通过滑块自由调节各项系数",
  },
];

function fmt(n: number): string {
  const v = Math.abs(n) < 1e-4 ? 0 : n;
  return v >= 0 ? `+ ${v.toFixed(1)}` : `- ${Math.abs(v).toFixed(1)}`;
}

function fmtLead(n: number): string {
  const v = Math.abs(n) < 1e-4 ? 0 : n;
  return v.toFixed(1);
}

export default function AbstractLinearMapDiagram() {
  const [presetKey, setPresetKey] = useState("parabola");
  const [a, setA] = useState<number>(2.0); // Constant term
  const [b, setB] = useState<number>(-3.0); // x term
  const [c, setC] = useState<number>(1.0); // x^2 term

  // Derivative polynomial: p'(x) = b + 2c * x
  const dConst = b;
  const dLinear = 2 * c;

  // Kernel & Range diagnostics
  const isZero = Math.abs(a) < 1e-4 && Math.abs(b) < 1e-4 && Math.abs(c) < 1e-4;
  const inKernel = Math.abs(b) < 1e-4 && Math.abs(c) < 1e-4; // Only constant term -> derivative is 0

  const handlePreset = (val: string) => {
    setPresetKey(val);
    if (val === "parabola") {
      setA(2.0);
      setB(-3.0);
      setC(1.0);
    } else if (val === "linear") {
      setA(4.0);
      setB(2.0);
      setC(0.0);
    } else if (val === "constant") {
      setA(5.0);
      setB(0.0);
      setC(0.0);
    }
  };

  return (
    <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
            抽象算子同构图：多项式空间 <InlineMath tex="\mathcal{P}_2" />{" "}
            与求导算子 <InlineMath tex="D" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            体验抽象函数世界的求导运算 <InlineMath tex="p'(x)" /> 与坐标空间{" "}
            <InlineMath tex="\mathbb{R}^3" /> 矩阵乘法{" "}
            <InlineMath tex="[D]\boldsymbol{\beta}" /> 的完全同构等价
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
          display={`${a.toFixed(1)}`}
          label="常数项 a"
          max={5.0}
          min={-5.0}
          onChange={(v) => {
            setA(v);
            setPresetKey("custom");
          }}
          step={0.5}
          value={a}
        />
        <ParamSlider
          display={`${b.toFixed(1)}`}
          label="一次项系数 b"
          max={5.0}
          min={-5.0}
          onChange={(v) => {
            setB(v);
            setPresetKey("custom");
          }}
          step={0.5}
          value={b}
        />
        <ParamSlider
          display={`${c.toFixed(1)}`}
          label="二次项系数 c"
          max={5.0}
          min={-5.0}
          onChange={(v) => {
            setC(v);
            setPresetKey("custom");
          }}
          step={0.5}
          value={c}
        />
      </div>

      {/* Two parallel worlds: Abstract Function World vs Matrix Coordinate World */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* World 1: Abstract Vector & Operator World */}
        <div className="flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/40 p-4 dark:border-sky-950 dark:bg-sky-950/20">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-900 dark:text-sky-300">
                1. 抽象向量与算子世界（函数空间）
              </span>
              <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                <InlineMath tex="\mathcal{P}_2 \xrightarrow{\; D \;} \mathcal{P}_2" />
              </span>
            </div>

            {/* Input polynomial */}
            <div className="mt-4 rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900">
              <div className="text-[11px] text-slate-500">
                输入抽象多项式 <InlineMath tex="p(x) \in \mathcal{P}_2" />：
              </div>
              <div className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">
                <InlineMath
                  tex={`p(x) = ${fmtLead(a)} ${fmt(b)} x ${fmt(c)} x^2`}
                />
              </div>
            </div>

            {/* Downward operator arrow */}
            <div className="my-2 flex items-center justify-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <span>施加微分算子</span>
              <InlineMath tex="D = \frac{\mathrm{d}}{\mathrm{d}x}" />
              <span>↓</span>
            </div>

            {/* Output derivative polynomial */}
            <div className="rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900">
              <div className="text-[11px] text-slate-500">
                导数多项式 <InlineMath tex="D(p) = p'(x) \in \mathcal{P}_2" />：
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-sky-700 dark:text-sky-400">
                <InlineMath
                  tex={`p'(x) = ${fmtLead(dConst)} ${fmt(dLinear)} x`}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded bg-white/70 p-2 text-center text-[11px] text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
            客观运算：多项式函数经微积分规则直接逐项求导
          </div>
        </div>

        {/* World 2: Matrix & Coordinate Vector World */}
        <div className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                2. 坐标与矩阵表示世界（数字空间）
              </span>
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                基底 <InlineMath tex="\mathcal{B}=(1, x, x^2)" />
              </span>
            </div>

            {/* Input coordinate vector */}
            <div className="mt-4 rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900">
              <div className="text-[11px] text-slate-500">
                坐标映射快照{" "}
                <InlineMath tex="\Phi_{\mathcal{B}}(p) = \boldsymbol{\beta} \in \mathbb{R}^3" />
                ：
              </div>
              <div className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">
                <InlineMath
                  tex={`[p(x)]_{\\mathcal{B}} = \\begin{pmatrix} ${a.toFixed(1)} \\\\ ${b.toFixed(1)} \\\\ ${c.toFixed(1)} \\end{pmatrix}`}
                />
              </div>
            </div>

            {/* Downward matrix arrow */}
            <div className="my-2 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>左乘算子矩阵</span>
              <InlineMath tex="[D]_{\mathcal{B}}" />
              <span>↓</span>
            </div>

            {/* Matrix multiplication result */}
            <div className="rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900">
              <div className="text-[11px] text-slate-500">
                矩阵乘法结果{" "}
                <InlineMath tex="[D]_{\mathcal{B}} [p]_{\mathcal{B}} \in \mathbb{R}^3" />
                ：
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                <InlineMath
                  tex={`\\begin{pmatrix} 0 & 1 & 0 \\\\ 0 & 0 & 2 \\\\ 0 & 0 & 0 \\end{pmatrix} \\begin{pmatrix} ${a.toFixed(1)} \\\\ ${b.toFixed(1)} \\\\ ${c.toFixed(1)} \\end{pmatrix} = \\begin{pmatrix} ${dConst.toFixed(1)} \\\\ ${dLinear.toFixed(1)} \\\\ 0.0 \\end{pmatrix}`}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded bg-white/70 p-2 text-center text-[11px] text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
            代数同构：数字矩阵乘积精确对应客观导数坐标！
          </div>
        </div>
      </div>

      {/* Diagnostics Card: Kernel, Image & Rank-Nullity Theorem */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            抽象核空间与秩-零度定理探针（Rank-Nullity Theorem）
          </span>
          {inKernel && !isZero && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              当前多项式位于核空间 ker(D) 中（求导得 0）
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400">
              核空间（零度 Nullity）
            </span>
            <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              <InlineMath tex="\ker(D) = \operatorname{span}(1)" />
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              零度 <InlineMath tex="\operatorname{nullity}(D) = 1" />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400">
              像空间（秩 Rank）
            </span>
            <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              <InlineMath tex="\operatorname{im}(D) = \operatorname{span}(1, x)" />
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              秩 <InlineMath tex="\operatorname{rank}(D) = 2" />
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-2.5 dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-emerald-700 dark:text-emerald-400">
              秩-零度守恒等式
            </span>
            <div className="mt-1 font-mono font-bold text-emerald-800 dark:text-emerald-300">
              <InlineMath tex="\dim(\mathcal{P}_2) = \text{nullity} + \text{rank}" />
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <InlineMath tex="3 = 1 + 2 \quad \text{（严格守恒）}" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
