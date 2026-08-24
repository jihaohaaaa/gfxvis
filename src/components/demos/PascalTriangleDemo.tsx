import { useMemo, useState } from "react";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";

// ─── helpers ───────────────────────────────────────────────────────────────

function buildTriangle(maxRow: number): number[][] {
  const rows: number[][] = [];
  for (let n = 0; n <= maxRow; n++) {
    const row: number[] = [];
    for (let r = 0; r <= n; r++) {
      row.push(
        n === 0 || r === 0 || r === n ? 1 : rows[n - 1][r - 1] + rows[n - 1][r],
      );
    }
    rows.push(row);
  }
  return rows;
}

interface CellKey {
  n: number;
  r: number;
}
function cellId(n: number, r: number) {
  return `${n},${r}`;
}

// ─── layout constants ──────────────────────────────────────────────────────

const HEADER_W = 40; // left header column width (px)
const HEADER_H = 32; // top header row height (px)
const CELL_W = 50; // cell width (px)
const CELL_H = 40; // cell height (px)

/** Pixel centre of cell (n, r) in the absolute coordinate space. */
function cellCx(r: number) {
  return HEADER_W + r * CELL_W + CELL_W / 2;
}
function cellCy(n: number) {
  return HEADER_H + n * CELL_H + CELL_H / 2;
}

// ─── component ─────────────────────────────────────────────────────────────

export default function PascalTriangleDemo() {
  const [maxRow, setMaxRow] = useState(7);
  const [selected, setSelected] = useState<CellKey | null>(null);

  const triangle = useMemo(() => buildTriangle(maxRow), [maxRow]);
  const sel = selected && selected.n <= maxRow ? selected : null;

  const totalW = HEADER_W + (maxRow + 1) * CELL_W;
  const totalH = HEADER_H + (maxRow + 1) * CELL_H;

  // Parent cells (Pascal recursion: cell above-left and cell above)
  const parents: CellKey[] = sel
    ? [
        ...(sel.r > 0 ? [{ n: sel.n - 1, r: sel.r - 1 }] : []),
        ...(sel.r <= sel.n - 1 ? [{ n: sel.n - 1, r: sel.r }] : []),
      ]
    : [];

  const selVal = sel ? triangle[sel.n][sel.r] : null;
  const parentVals = parents.map((p) => triangle[p.n][p.r]);

  const handleClick = (n: number, r: number) => {
    setSelected(sel?.n === n && sel?.r === r ? null : { n, r });
  };

  const handleReset = () => {
    setSelected(null);
    setMaxRow(7);
  };

  // Shared border/bg tokens used in SVG (must match Tailwind tokens)
  const accentColor = "var(--color-accent)";

  return (
    <ExpandableDemo id="pascal-triangle">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        {/* ── controls ── */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <ParamSlider
            label={
              <span>
                行数 <InlineMath tex="n" />
              </span>
            }
            value={maxRow}
            min={2}
            max={10}
            step={1}
            display={String(maxRow + 1)}
            digits={0}
            onChange={(v) => {
              setMaxRow(v);
              if (selected && selected.n > v) setSelected(null);
            }}
          />
          <button
            type="button"
            className="text-xs text-muted underline underline-offset-4 hover:text-accent"
            onClick={handleReset}
          >
            重置
          </button>
        </div>

        {/* ── table grid ── */}
        <div className="w-full overflow-x-auto">
          <div
            className="relative mx-auto select-none"
            style={{ width: totalW, height: totalH }}
            role="grid"
            aria-label="Pascal 三角形（直角三角格式）"
          >
            {/* ── SVG: connection lines only ── */}
            <svg
              width={totalW}
              height={totalH}
              viewBox={`0 0 ${totalW} ${totalH}`}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              {sel &&
                parents.map((p) => (
                  <line
                    key={cellId(p.n, p.r)}
                    x1={cellCx(sel.r)}
                    y1={cellCy(sel.n)}
                    x2={cellCx(p.r)}
                    y2={cellCy(p.n)}
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    opacity="0.7"
                  />
                ))}
            </svg>

            {/* ── Corner cell ── */}
            <div
              className="absolute flex items-center justify-center border-b border-r border-border bg-surface-hover text-[10px] text-muted"
              style={{ left: 0, top: 0, width: HEADER_W, height: HEADER_H }}
            >
              n\r
            </div>

            {/* ── Column headers (r = 0 … maxRow) ── */}
            {Array.from({ length: maxRow + 1 }, (_, r) => {
              const isActive = sel?.r === r;
              return (
                <div
                  key={`ch${r}`}
                  className={`absolute flex items-center justify-center border-b border-r border-border text-xs font-mono font-semibold transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent"
                      : "bg-surface-hover text-muted"
                  }`}
                  style={{
                    left: HEADER_W + r * CELL_W,
                    top: 0,
                    width: CELL_W,
                    height: HEADER_H,
                  }}
                >
                  {r}
                </div>
              );
            })}

            {/* ── Row headers (n = 0 … maxRow) ── */}
            {triangle.map((_, n) => {
              const isActive = sel?.n === n;
              return (
                <div
                  key={`rh${n}`}
                  className={`absolute flex items-center justify-center border-b border-r border-border text-xs font-mono font-semibold transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent"
                      : "bg-surface-hover text-muted"
                  }`}
                  style={{
                    left: 0,
                    top: HEADER_H + n * CELL_H,
                    width: HEADER_W,
                    height: CELL_H,
                  }}
                >
                  {n}
                </div>
              );
            })}

            {/* ── Data cells ── */}
            {triangle.map((row, n) =>
              row.map((val, r) => {
                const isSel = sel?.n === n && sel?.r === r;
                const isParent = parents.some((p) => p.n === n && p.r === r);

                let cls =
                  "bg-background hover:bg-surface-hover border-border/60 text-foreground";
                if (isSel)
                  cls =
                    "bg-accent text-accent-foreground border-accent shadow-sm scale-105";
                else if (isParent)
                  cls = "bg-accent/15 text-accent border-accent/60";

                return (
                  <button
                    key={cellId(n, r)}
                    type="button"
                    role="gridcell"
                    aria-label={`C(${n},${r}) = ${val}${isSel ? "，已选中" : ""}`}
                    aria-pressed={isSel}
                    onClick={() => handleClick(n, r)}
                    style={{
                      position: "absolute",
                      left: HEADER_W + r * CELL_W + 3,
                      top: HEADER_H + n * CELL_H + 3,
                      width: CELL_W - 6,
                      height: CELL_H - 6,
                    }}
                    className={`flex cursor-pointer items-center justify-center rounded border text-xs font-mono transition-all duration-150 active:scale-95 ${cls}`}
                  >
                    <span className={val > 999 ? "text-[10px]" : ""}>
                      {val}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {/* ── Info bar ── */}
        <div
          className="min-h-[3.5rem] rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
          aria-live="polite"
        >
          {sel === null ? (
            <p className="text-muted">点击任意格子，查看 Pascal 递推关系。</p>
          ) : sel.n === 0 ? (
            <p className="text-muted">
              <InlineMath tex={`\\binom{0}{0} = 1`} />
              &ensp;是三角形的顶点，边界条件。
            </p>
          ) : parents.length === 1 ? (
            <p className="text-muted">
              <InlineMath tex={`\\binom{${sel.n}}{${sel.r}} = ${selVal}`} />
              &ensp;是边界格子（
              <InlineMath tex={sel.r === 0 ? "r=0" : "r=n"} />
              ），由定义直接为&thinsp;1。
            </p>
          ) : (
            <p>
              <InlineMath
                tex={`\\binom{${sel.n}}{${sel.r}} = \\binom{${parents[0].n}}{${parents[0].r}} + \\binom{${parents[1].n}}{${parents[1].r}} = ${parentVals[0]} + ${parentVals[1]} = ${selVal}`}
              />
            </p>
          )}
        </div>

        <p className="text-xs text-muted">
          左侧为行序号&thinsp;
          <InlineMath tex="n" />
          ，顶部为列序号&thinsp;
          <InlineMath tex="r" />
          ；点击同一格子可取消选中。
        </p>
      </div>
    </ExpandableDemo>
  );
}
