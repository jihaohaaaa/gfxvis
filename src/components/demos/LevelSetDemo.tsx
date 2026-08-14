import { useState } from "react";
import {
  FIELDS2D,
  type Field2DId,
} from "../../visualizations/demos/scalar-field/field";
import { drawAxes, drawPolyline } from "../../visualizations/core/plot2d";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";

const MARGIN = 24;
const REF_COUNT = 5;

type LevelFieldId = Extract<Field2DId, "circle" | "parabola">;

const FIELD_OPTIONS: { id: LevelFieldId; label: string }[] = [
  { id: "circle", label: "圆族" },
  { id: "parabola", label: "抛物线族" },
];

/** 2D level-set explorer: sweep the level curve F(x, y) = c with a slider. */
export default function LevelSetDemo({ height }: { height?: string }) {
  const [fieldId, setFieldId] = useState<LevelFieldId>("circle");
  const [c, setC] = useState(1.5);

  const field = FIELDS2D[fieldId];

  const { containerRef, canvasRef, setBounds } = useCanvas2D(
    {
      initialBounds: FIELDS2D.circle.bounds,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const f = FIELDS2D[fieldId];
        drawAxes(ctx, plot, theme, f.ticksX, f.ticksY);

        // A few reference level curves of the family (dashed).
        for (let k = 1; k <= REF_COUNT; k++) {
          const ck = f.cMin + ((f.cMax - f.cMin) * k) / (REF_COUNT + 1);
          drawPolyline(ctx, plot, f.levelCurve?.(ck, 120) ?? [], {
            color: theme.border,
            width: 1.2,
            dash: [4, 4],
            alpha: 0.9,
          });
        }

        // The current level curve F = c (solid accent).
        drawPolyline(ctx, plot, f.levelCurve?.(c, 160) ?? [], {
          color: theme.accent,
          width: 2.2,
        });
      },
    },
    [fieldId, c],
  );

  const handleFieldChange = (id: LevelFieldId): void => {
    setFieldId(id);
    const f = FIELDS2D[id];
    setC(f.defaultC);
    setBounds(f.bounds);
  };

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CapsuleTabs
              options={FIELD_OPTIONS}
              value={fieldId}
              onChange={handleFieldChange}
            />
            <ParamSlider
              label={<InlineMath tex="c" />}
              min={field.cMin}
              max={field.cMax}
              step={0.01}
              value={c}
              onChange={setC}
              widthClass="w-44"
            />
          </div>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`F(x,y) = ${field.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`F(x,y) = ${c.toFixed(2)} \\Rightarrow ${field.levelTex(c)}`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖动 c 滑块扫描一族等值线:实线为当前
          F(x,y)=c,虚线为参考等值线;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
