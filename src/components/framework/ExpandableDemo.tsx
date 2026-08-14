import { useState, useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
  height?: string;
}

/**
 * Pseudo-fullscreen & resizable wrapper: the expand button grows the single instance
 * into a fixed overlay with a larger canvas (--demo-height: 70vh).
 * Inline mode supports dynamic vertical resizing via the bottom handle or height prop.
 */
export default function ExpandableDemo({
  children,
  label = "展开",
  height,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const demoEl =
      container.querySelector<HTMLElement>('[class*="demo-height"]') ||
      container;
    const startY = e.clientY;
    const startDemoHeight = demoEl.getBoundingClientRect().height;

    const handleTarget = e.currentTarget;
    try {
      handleTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore fallback */
    }
    setIsResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(850, startDemoHeight + deltaY));
      setCustomHeight(newHeight);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsResizing(false);
      try {
        handleTarget.releasePointerCapture(upEvent.pointerId);
      } catch {
        /* ignore fallback */
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  let activeHeightStyle: Record<string, string> | undefined = undefined;
  if (expanded) {
    activeHeightStyle = { ["--demo-height" as string]: "70vh" };
  } else if (customHeight !== null) {
    activeHeightStyle = { ["--demo-height" as string]: `${customHeight}px` };
  } else if (height) {
    activeHeightStyle = { ["--demo-height" as string]: height };
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={
          expanded
            ? "fixed inset-[2%] z-50 overflow-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-6"
            : ""
        }
      >
        {expanded && (
          <div className="sticky top-0 z-10 mb-3 flex justify-end">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(false);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="关闭交互区"
              title="关闭"
            >
              ✕ 关闭
            </button>
          </div>
        )}
        <div style={activeHeightStyle}>{children}</div>
      </div>

      {!expanded && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(true);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute right-3 top-3 z-10 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
            aria-label="展开交互区"
            title="展开交互区"
          >
            ⛶ {label}
          </button>

          {/* Bottom Resizer Handle */}
          <div
            onPointerDown={handlePointerDown}
            className={`group relative mt-1.5 flex h-4 w-full cursor-ns-resize items-center justify-center select-none ${
              isResizing ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            title="按住上下拖拽调节高度"
            aria-label="调节高度"
          >
            <div className="h-1.5 w-12 rounded-full bg-border transition-all group-hover:w-16 group-hover:bg-accent" />
          </div>
        </>
      )}
    </div>
  );
}
