import React, { useState } from "react";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";

const PRESETS: PresetOption[] = [
  {
    value: "stretch_x",
    label: "水平单向拉伸 (Sx=2.2, Sy=0.8)",
    description: "沿 x 轴大幅拉伸，导致原始法线向切向发生严重偏角",
  },
  {
    value: "shear_stretch",
    label: "剪切与缩放结合 (Sx=1.8, kx=0.8)",
    description: "引入剪切形变 kx，法线失真极其显著",
  },
  {
    value: "uniform",
    label: "等比缩放 (Sx=1.5, Sy=1.5)",
    description: "正交各向同性缩放，直接用 M 变换法线恰好保角（特例）",
  },
  {
    value: "compress_x",
    label: "水平压缩 (Sx=0.6, Sy=1.6)",
    description: "沿 x 轴挤压，表面坡度变陡峭",
  },
];

function fmt(n: number): string {
  const v = Math.abs(n) < 1e-4 ? 0 : n;
  return v.toFixed(2);
}

export default function NormalMatrixTransformDiagram() {
  const [presetKey, setPresetKey] = useState("stretch_x");
  const [sx, setSx] = useState<number>(2.2);
  const [sy, setSy] = useState<number>(0.8);
  const [kx, setKx] = useState<number>(0.0);

  // Initial geometry: a tilted surface patch
  // Tangent t0 = (cos 30°, sin 30°)
  // Normal n0 = (-sin 30°, cos 30°) so that n0 · t0 = 0
  const angle0 = (28 * Math.PI) / 180;
  const t0 = { x: Math.cos(angle0), y: Math.sin(angle0) };
  const n0 = { x: -Math.sin(angle0), y: Math.cos(angle0) };

  // Model matrix M = [ [sx, kx], [0, sy] ]
  // t' = M * t0
  const tPrime = {
    x: sx * t0.x + kx * t0.y,
    y: sy * t0.y,
  };

  // Wrong normal: n'_wrong = M * n0
  const nWrong = {
    x: sx * n0.x + kx * n0.y,
    y: sy * n0.y,
  };

  // Normal matrix: N = (M^-1)^T
  // Det(M) = sx * sy
  // M^-1 = 1/(sx*sy) * [ [sy, -kx], [0, sx] ] = [ [1/sx, -kx/(sx*sy)], [0, 1/sy] ]
  // (M^-1)^T = [ [1/sx, 0], [-kx/(sx*sy), 1/sy] ]
  const detM = sx * sy || 1e-5;
  const nCorrect = {
    x: (1 / sx) * n0.x,
    y: (-kx / detM) * n0.x + (1 / sy) * n0.y,
  };

  // Dot products & angles
  const dotWrong = nWrong.x * tPrime.x + nWrong.y * tPrime.y;
  const lenTPrime = Math.hypot(tPrime.x, tPrime.y);
  const lenNWrong = Math.hypot(nWrong.x, nWrong.y);
  const cosWrong = Math.max(
    -1,
    Math.min(1, dotWrong / (lenTPrime * lenNWrong)),
  );
  const angleWrongDeg = (Math.acos(cosWrong) * 180) / Math.PI;

  const dotCorrect = nCorrect.x * tPrime.x + nCorrect.y * tPrime.y;
  const lenNCorrect = Math.hypot(nCorrect.x, nCorrect.y);
  const cosCorrect = Math.max(
    -1,
    Math.min(1, dotCorrect / (lenTPrime * lenNCorrect)),
  );
  const angleCorrectDeg = (Math.acos(cosCorrect) * 180) / Math.PI;

  const handlePreset = (val: string) => {
    setPresetKey(val);
    if (val === "stretch_x") {
      setSx(2.2);
      setSy(0.8);
      setKx(0.0);
    } else if (val === "shear_stretch") {
      setSx(1.8);
      setSy(0.9);
      setKx(0.8);
    } else if (val === "uniform") {
      setSx(1.5);
      setSy(1.5);
      setKx(0.0);
    } else if (val === "compress_x") {
      setSx(0.6);
      setSy(1.6);
      setKx(0.0);
    }
  };

  // SVG viewport dimensions
  const svgW = 200;
  const svgH = 170;
  const ox = 90;
  const oy = 115;
  const scalePx = 45;

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 shadow-xs backdrop-blur-xs transition-colors md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            非等比几何变换下的表面法线矩阵纠偏模型
          </span>
        </div>
        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
          对偶协变变换
        </span>
      </div>

      {/* Preset Selector */}
      <PresetSelector
        label="模型变换矩阵 M 参数预设:"
        options={PRESETS}
        value={presetKey}
        onChange={handlePreset}
      />

      {/* 3 Comparison Panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Panel 1: Original */}
        <div className="flex flex-col rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-center">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">
              1. 原始几何表面
            </span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
              θ = 90.0°
            </span>
          </div>

          {/* SVG Canvas */}
          <div className="relative my-2 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="h-36 w-full max-w-[200px]"
            >
              {/* Grid / Axes */}
              <line
                x1={15}
                y1={oy}
                x2={svgW - 15}
                y2={oy}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />
              <line
                x1={ox}
                y1={15}
                x2={ox}
                y2={svgH - 15}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />

              {/* Surface line */}
              <line
                x1={ox - t0.x * scalePx * 1.3}
                y1={oy + t0.y * scalePx * 1.3}
                x2={ox + t0.x * scalePx * 1.3}
                y2={oy - t0.y * scalePx * 1.3}
                stroke="#64748b"
                strokeWidth={2}
              />

              {/* Tangent vector t (Blue) */}
              <defs>
                <marker
                  id="arrow-tangent"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#2563eb" />
                </marker>
                <marker
                  id="arrow-normal-orig"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                </marker>
                <marker
                  id="arrow-normal-wrong"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                </marker>
                <marker
                  id="arrow-normal-correct"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                </marker>
              </defs>

              <line
                x1={ox}
                y1={oy}
                x2={ox + t0.x * scalePx}
                y2={oy - t0.y * scalePx}
                stroke="#2563eb"
                strokeWidth={2.5}
                markerEnd="url(#arrow-tangent)"
              />
              <text
                x={ox + t0.x * scalePx + 6}
                y={oy - t0.y * scalePx + 4}
                className="text-[10px] font-bold fill-blue-600 dark:fill-blue-400"
              >
                t
              </text>

              {/* Normal vector n (Emerald) */}
              <line
                x1={ox}
                y1={oy}
                x2={ox + n0.x * scalePx}
                y2={oy - n0.y * scalePx}
                stroke="#059669"
                strokeWidth={2.5}
                markerEnd="url(#arrow-normal-orig)"
              />
              <text
                x={ox + n0.x * scalePx - 10}
                y={oy - n0.y * scalePx - 4}
                className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400"
              >
                n
              </text>

              {/* Orthogonal symbol */}
              <rect
                x={ox + 2}
                y={oy - 8}
                width={6}
                height={6}
                fill="none"
                stroke="#059669"
                strokeWidth={1}
                transform={`rotate(${-28}, ${ox}, ${oy})`}
              />
            </svg>
          </div>

          <div className="font-mono text-[11px] text-muted space-y-0.5">
            <p>
              切向量 <InlineMath tex="\mathbf{t} = (0.88, 0.47)^\top" />
            </p>
            <p>
              法向量 <InlineMath tex="\mathbf{n} = (-0.47, 0.88)^\top" />
            </p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
              点积检验：
              <InlineMath tex="\mathbf{n}^\top \mathbf{t} = 0.00" /> (严格垂直)
            </p>
          </div>
        </div>

        {/* Panel 2: Incorrect M * n */}
        <div className="flex flex-col rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-center">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-1.5">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
              2. 错误: 直接用 M 变换法线
            </span>
            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
              θ = {fmt(angleWrongDeg)}°
            </span>
          </div>

          {/* SVG Canvas */}
          <div className="relative my-2 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="h-36 w-full max-w-[200px]"
            >
              <line
                x1={15}
                y1={oy}
                x2={svgW - 15}
                y2={oy}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />
              <line
                x1={ox}
                y1={15}
                x2={ox}
                y2={svgH - 15}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />

              {/* Deformed surface line */}
              <line
                x1={ox - (tPrime.x / lenTPrime) * scalePx * 1.3}
                y1={oy + (tPrime.y / lenTPrime) * scalePx * 1.3}
                x2={ox + (tPrime.x / lenTPrime) * scalePx * 1.3}
                y2={oy - (tPrime.y / lenTPrime) * scalePx * 1.3}
                stroke="#64748b"
                strokeWidth={2}
              />

              {/* Transformed Tangent t' (Blue) */}
              <line
                x1={ox}
                y1={oy}
                x2={ox + (tPrime.x / lenTPrime) * scalePx}
                y2={oy - (tPrime.y / lenTPrime) * scalePx}
                stroke="#2563eb"
                strokeWidth={2.5}
                markerEnd="url(#arrow-tangent)"
              />
              <text
                x={ox + (tPrime.x / lenTPrime) * scalePx + 6}
                y={oy - (tPrime.y / lenTPrime) * scalePx + 4}
                className="text-[10px] font-bold fill-blue-600 dark:fill-blue-400"
              >
                t' = Mt
              </text>

              {/* Wrong transformed normal (Red) */}
              <line
                x1={ox}
                y1={oy}
                x2={ox + (nWrong.x / lenNWrong) * scalePx}
                y2={oy - (nWrong.y / lenNWrong) * scalePx}
                stroke="#dc2626"
                strokeWidth={2.5}
                markerEnd="url(#arrow-normal-wrong)"
              />
              <text
                x={ox + (nWrong.x / lenNWrong) * scalePx - 16}
                y={oy - (nWrong.y / lenNWrong) * scalePx - 4}
                className="text-[10px] font-bold fill-red-600 dark:fill-red-400"
              >
                n' = Mn
              </text>
            </svg>
          </div>

          <div className="font-mono text-[11px] text-muted space-y-0.5">
            <p>
              变换切向{" "}
              <InlineMath
                tex={`\\mathbf{t}' = (${fmt(tPrime.x)},\\, ${fmt(tPrime.y)})`}
              />
            </p>
            <p>
              错误法向{" "}
              <InlineMath
                tex={`\\mathbf{n}' = (${fmt(nWrong.x)},\\, ${fmt(nWrong.y)})`}
              />
            </p>
            <p className="font-semibold text-red-600 dark:text-red-400 pt-1 border-t border-border/40">
              点积检验：
              <InlineMath
                tex={`\\mathbf{n}'^\\top \\mathbf{t}' = ${fmt(dotWrong)}`}
              />{" "}
              (✕ 不再垂直!)
            </p>
          </div>
        </div>

        {/* Panel 3: Correct (M^-1)^T * n */}
        <div className="flex flex-col rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-center">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
              3. 正确: 用 (M⁻¹)ᵀ 变换法线
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              θ = {fmt(angleCorrectDeg)}°
            </span>
          </div>

          {/* SVG Canvas */}
          <div className="relative my-2 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="h-36 w-full max-w-[200px]"
            >
              <line
                x1={15}
                y1={oy}
                x2={svgW - 15}
                y2={oy}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />
              <line
                x1={ox}
                y1={15}
                x2={ox}
                y2={svgH - 15}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />

              {/* Deformed surface line */}
              <line
                x1={ox - (tPrime.x / lenTPrime) * scalePx * 1.3}
                y1={oy + (tPrime.y / lenTPrime) * scalePx * 1.3}
                x2={ox + (tPrime.x / lenTPrime) * scalePx * 1.3}
                y2={oy - (tPrime.y / lenTPrime) * scalePx * 1.3}
                stroke="#64748b"
                strokeWidth={2}
              />

              {/* Transformed Tangent t' (Blue) */}
              <line
                x1={ox}
                y1={oy}
                x2={ox + (tPrime.x / lenTPrime) * scalePx}
                y2={oy - (tPrime.y / lenTPrime) * scalePx}
                stroke="#2563eb"
                strokeWidth={2.5}
                markerEnd="url(#arrow-tangent)"
              />
              <text
                x={ox + (tPrime.x / lenTPrime) * scalePx + 6}
                y={oy - (tPrime.y / lenTPrime) * scalePx + 4}
                className="text-[10px] font-bold fill-blue-600 dark:fill-blue-400"
              >
                t' = Mt
              </text>

              {/* Correct transformed normal (Emerald) */}
              <line
                x1={ox}
                y1={oy}
                x2={ox + (nCorrect.x / lenNCorrect) * scalePx}
                y2={oy - (nCorrect.y / lenNCorrect) * scalePx}
                stroke="#059669"
                strokeWidth={2.5}
                markerEnd="url(#arrow-normal-correct)"
              />
              <text
                x={ox + (nCorrect.x / lenNCorrect) * scalePx - 24}
                y={oy - (nCorrect.y / lenNCorrect) * scalePx - 4}
                className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400"
              >
                n' = M⁻ᵀn
              </text>
            </svg>
          </div>

          <div className="font-mono text-[11px] text-muted space-y-0.5">
            <p>
              变换切向{" "}
              <InlineMath
                tex={`\\mathbf{t}' = (${fmt(tPrime.x)},\\, ${fmt(tPrime.y)})`}
              />
            </p>
            <p>
              逆转置法向{" "}
              <InlineMath
                tex={`\\mathbf{n}' = (${fmt(nCorrect.x)},\\, ${fmt(nCorrect.y)})`}
              />
            </p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
              点积检验：
              <InlineMath
                tex={`\\mathbf{n}'^\\top \\mathbf{t}' = ${fmt(dotCorrect)}`}
              />{" "}
              (✓ 恢复正交!)
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls Sliders */}
      <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-3">
        <p className="font-semibold text-foreground">
          调整模型变换矩阵{" "}
          <InlineMath tex="M = \begin{bmatrix} S_x & k_x \\ 0 & S_y \end{bmatrix}" />
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <ParamSlider
            label="Sx (水平缩放)"
            value={sx}
            min={0.4}
            max={3.0}
            step={0.1}
            onChange={(val) => {
              setSx(val);
              setPresetKey("custom");
            }}
          />
          <ParamSlider
            label="Sy (垂直缩放)"
            value={sy}
            min={0.4}
            max={3.0}
            step={0.1}
            onChange={(val) => {
              setSy(val);
              setPresetKey("custom");
            }}
          />
          <ParamSlider
            label="kx (水平剪切)"
            value={kx}
            min={-1.2}
            max={1.2}
            step={0.1}
            onChange={(val) => {
              setKx(val);
              setPresetKey("custom");
            }}
          />
        </div>
      </div>
    </div>
  );
}
