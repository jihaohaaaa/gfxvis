import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import CanvasResizer from "./CanvasResizer";

export interface HeightPreset {
  id: "sm" | "md" | "lg";
  label: string;
  height: number;
}

export const DEFAULT_HEIGHT_PRESETS: HeightPreset[] = [
  { id: "sm", label: "S", height: 300 },
  { id: "md", label: "M", height: 420 },
  { id: "lg", label: "L", height: 560 },
];

export interface ExpandableContextValue {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  customHeight: number | null;
  setCustomHeight: (height: number | null) => void;
  activePresetId?: "sm" | "md" | "lg" | null;
  setPresetHeight: (id: "sm" | "md" | "lg") => void;
}

export const ExpandableContext = createContext<ExpandableContextValue | null>(
  null,
);

export function useExpandable(): ExpandableContextValue | null {
  return useContext(ExpandableContext);
}

interface Props {
  children: ReactNode;
  /** Unique identifier for per-demo persistence */
  id?: string;
  /** Optional custom storage key for localStorage */
  storageKey?: string;
  label?: string;
  height?: string;
  /** Whether to show external fallback expand button (default: false since CanvasToolbar handles it) */
  showFallbackButton?: boolean;
}

/**
 * Pseudo-fullscreen & resizable wrapper: provides ExpandableContext for child components
 * and expands into a fixed overlay with larger canvas (--demo-height: 70vh).
 * Inline mode supports dynamic vertical resizing via the bottom handle, presets, or height prop,
 * with per-demo localStorage height memory persistence.
 * Preserves scroll reading position across expand / collapse transitions.
 */
export default function ExpandableDemo({
  children,
  id,
  storageKey,
  label = "展开",
  height,
  showFallbackButton = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(
    null,
  );
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive a stable localStorage key for this demo instance
  const effectiveKey = storageKey || (id ? `gfxvis:height:${id}` : undefined);

  // Load persisted height on mount
  useEffect(() => {
    if (typeof window === "undefined" || !effectiveKey) return;
    try {
      const saved = window.localStorage.getItem(effectiveKey);
      if (saved) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed) && parsed >= 150 && parsed <= 900) {
          setCustomHeight(parsed);
        }
      }
    } catch {
      /* ignore storage access error */
    }
  }, [effectiveKey]);

  const updateCustomHeight = (val: number | null) => {
    setCustomHeight(val);
    if (typeof window === "undefined" || !effectiveKey) return;
    try {
      if (val !== null) {
        window.localStorage.setItem(effectiveKey, String(val));
      } else {
        window.localStorage.removeItem(effectiveKey);
      }
    } catch {
      /* ignore storage access error */
    }
  };

  const openExpanded = () => {
    if (containerRef.current) {
      setPlaceholderHeight(containerRef.current.offsetHeight);
    }
    setExpanded(true);
  };

  const closeExpanded = () => {
    setExpanded(false);
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
  };

  const setPresetHeight = (presetId: "sm" | "md" | "lg") => {
    const target = DEFAULT_HEIGHT_PRESETS.find((p) => p.id === presetId);
    if (target) {
      updateCustomHeight(target.height);
    }
  };

  let activePresetId: "sm" | "md" | "lg" | null = null;
  if (customHeight === 300) activePresetId = "sm";
  else if (customHeight === 420) activePresetId = "md";
  else if (customHeight === 560) activePresetId = "lg";

  const contextValue: ExpandableContextValue = {
    isExpanded: expanded,
    setExpanded: (val: boolean) => {
      if (val) openExpanded();
      else closeExpanded();
    },
    toggleExpanded: () => {
      if (expanded) closeExpanded();
      else openExpanded();
    },
    customHeight,
    setCustomHeight: updateCustomHeight,
    activePresetId,
    setPresetHeight,
  };

  // Lock body scroll while in expanded modal mode so background document doesn't scroll
  useEffect(() => {
    if (expanded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [expanded]);

  let activeHeightStyle: Record<string, string> | undefined = undefined;
  if (expanded) {
    activeHeightStyle = { ["--demo-height" as string]: "70vh" };
  } else if (customHeight !== null) {
    activeHeightStyle = { ["--demo-height" as string]: `${customHeight}px` };
  } else if (height) {
    activeHeightStyle = { ["--demo-height" as string]: height };
  }

  return (
    <ExpandableContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative">
        {/* Placeholder keeping exact document flow height while in fixed modal */}
        {expanded && placeholderHeight !== null && (
          <div
            style={{ height: `${placeholderHeight}px` }}
            aria-hidden="true"
          />
        )}

        <div
          className={
            expanded
              ? "fixed inset-[2%] z-50 overflow-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-6"
              : ""
          }
        >
          {expanded && (
            <div className="sticky top-0 z-30 mb-3 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeExpanded();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted transition-all hover:border-accent hover:bg-accent/15 hover:text-accent active:scale-95"
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
            {showFallbackButton && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openExpanded();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute right-3 top-3 z-10 cursor-pointer rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
                aria-label="展开交互区"
                title="展开交互区"
              >
                ⛶ {label}
              </button>
            )}

            {/* Bottom Resizer Handle */}
            <CanvasResizer className="mt-1" />
          </>
        )}
      </div>
    </ExpandableContext.Provider>
  );
}
