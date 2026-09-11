import InlineMath from "../framework/InlineMath";

export default function FunctionMappingDiagram() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>函数声明、陪域与像集</span>
        </div>
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
          <InlineMath tex="f: A \to B" />
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-background/55 p-2 sm:p-3">
        <svg
          aria-describedby="function-mapping-diagram-description"
          aria-labelledby="function-mapping-diagram-title"
          className="h-auto w-full"
          role="img"
          viewBox="0 0 720 320"
        >
          <title id="function-mapping-diagram-title">
            有限集合上的函数映射示意图
          </title>
          <desc id="function-mapping-diagram-description">
            定义域 A 的三个元素各有且仅有一条箭头指向陪域
            B。两个输入可以指向同一个输出，B 中的未命中元素不属于像集。
          </desc>
          <defs>
            <marker
              id="function-arrowhead"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path className="fill-accent" d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>

          <rect
            className="fill-surface stroke-border"
            height="242"
            rx="12"
            strokeWidth="1.5"
            width="220"
            x="35"
            y="40"
          />
          <rect
            className="fill-surface stroke-border"
            height="242"
            rx="12"
            strokeWidth="1.5"
            width="220"
            x="465"
            y="40"
          />

          <text className="fill-ink text-sm font-semibold" x="55" y="72">
            定义域 A
          </text>
          <text className="fill-muted text-[11px]" x="55" y="91">
            合法输入的全集
          </text>
          <text className="fill-ink text-sm font-semibold" x="485" y="72">
            陪域 B
          </text>
          <text className="fill-muted text-[11px]" x="485" y="91">
            声明的目标集合
          </text>

          <rect
            className="fill-accent/5 stroke-accent"
            height="142"
            rx="10"
            strokeDasharray="5 4"
            strokeWidth="1.5"
            width="112"
            x="535"
            y="100"
          />
          <text
            className="fill-accent text-[11px] font-semibold"
            x="551"
            y="120"
          >
            像集 im f
          </text>

          <g className="fill-surface stroke-accent" strokeWidth="2">
            <circle cx="135" cy="126" r="20" />
            <circle cx="135" cy="180" r="20" />
            <circle cx="135" cy="234" r="20" />
          </g>
          <g className="fill-surface stroke-chart-2" strokeWidth="2">
            <circle cx="585" cy="146" r="20" />
            <circle cx="585" cy="198" r="20" />
          </g>
          <circle
            className="fill-surface stroke-muted"
            cx="585"
            cy="250"
            r="20"
            strokeDasharray="4 3"
            strokeWidth="1.5"
          />

          <g className="fill-ink text-xs font-semibold" textAnchor="middle">
            <text x="135" y="131">
              a1
            </text>
            <text x="135" y="185">
              a2
            </text>
            <text x="135" y="239">
              a3
            </text>
            <text x="585" y="151">
              b1
            </text>
            <text x="585" y="203">
              b2
            </text>
          </g>
          <text
            className="fill-muted text-xs font-semibold"
            textAnchor="middle"
            x="585"
            y="255"
          >
            b3
          </text>

          <g
            className="stroke-accent"
            fill="none"
            markerEnd="url(#function-arrowhead)"
            strokeWidth="2.25"
          >
            <path d="M 156 126 C 285 104, 420 112, 562 146" />
            <path d="M 156 180 C 300 180, 420 188, 562 198" />
            <path d="M 156 234 C 286 256, 430 224, 562 198" />
          </g>

          <text
            className="fill-accent text-sm font-semibold"
            textAnchor="middle"
            x="360"
            y="142"
          >
            f
          </text>
          <text
            className="fill-muted text-[11px]"
            textAnchor="middle"
            x="360"
            y="162"
          >
            每个输入恰有一个输出
          </text>
          <text
            className="fill-muted text-[11px]"
            textAnchor="middle"
            x="585"
            y="280"
          >
            b3 在陪域中，但未被命中
          </text>
        </svg>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
        <p className="rounded-md border border-border/60 bg-surface px-3 py-2">
          每个 <InlineMath tex="a \in A" /> 都必须有像。
        </p>
        <p className="rounded-md border border-border/60 bg-surface px-3 py-2">
          一个输入不能指向两个不同输出。
        </p>
        <p className="rounded-md border border-border/60 bg-surface px-3 py-2">
          多个输入可共享输出，陪域也可有空位。
        </p>
      </div>
    </div>
  );
}
