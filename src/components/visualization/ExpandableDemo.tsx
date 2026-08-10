import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

/**
 * Pseudo-fullscreen wrapper: the expand button grows the same (single) instance
 * into a fixed overlay (not the Fullscreen API) with a larger canvas
 * (--demo-height: 70vh); the close button restores the inline layout. State is
 * preserved because the children are never re-mounted.
 */
export default function ExpandableDemo({ children, label = "展开" }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
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
        <div
          style={expanded ? { ["--demo-height" as string]: "70vh" } : undefined}
        >
          {children}
        </div>
      </div>
      {!expanded && (
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
      )}
    </div>
  );
}
