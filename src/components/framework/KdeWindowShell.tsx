import { AutoMath } from "./AutoMath";
import type { ReactNode } from "react";
import "./KdeWindowShell.css";
import InteractiveLayout, {
  type InteractiveLayoutPreset,
} from "./InteractiveLayout";
import { useExpandable } from "./ExpandableDemo";

export interface KdeWindowShellProps {
  title: string;
  eyebrow?: string;
  mark?: string;
  modeTag?: string;
  display?: ReactNode;
  controls?: ReactNode;
  tabs?: ReactNode;
  footer?: ReactNode;
  readouts?: ReactNode;
  navigation?: ReactNode;
  secondary?: ReactNode;
  layoutPreset?: InteractiveLayoutPreset;
  children?: ReactNode;
  testId?: string;
  channel?: string;
  showExpand?: boolean;
  className?: string;
  dataStyle?: string;
  dataFixedLayout?: string;
  "data-style"?: string;
  "data-fixed-layout"?: string;
}

/**
 * KDE Breeze Desktop Window Shell component.
 * Provides a standardized window bar (title, mark, eyebrow, mode badge, expand button),
 * wrapped in AutoMath for automatic KaTeX math rendering, and unified layout via InteractiveLayout.
 */
export default function KdeWindowShell({
  title,
  eyebrow = "BREEZE WORKSPACE · AFFINE GEOMETRY",
  mark = "B",
  modeTag = "WINDOWED",
  display,
  controls,
  tabs,
  footer,
  readouts,
  navigation,
  secondary,
  layoutPreset = "side-right",
  children,
  testId,
  channel,
  showExpand = true,
  className = "",
  dataStyle,
  dataFixedLayout,
  "data-style": dataStyleKebab,
  "data-fixed-layout": dataFixedLayoutKebab,
}: KdeWindowShellProps) {
  const expandable = useExpandable();
  const canExpand =
    showExpand && Boolean(expandable) && !expandable?.isExpanded;

  const bottomContent = footer || readouts;
  const finalDataStyle = dataStyleKebab ?? dataStyle;
  const finalDataFixedLayout = dataFixedLayoutKebab ?? dataFixedLayout;

  return (
    <AutoMath>
      <section
        className={`kde-window-shell ${className}`}
        data-window-shell="kde"
        data-style={finalDataStyle}
        data-fixed-layout={finalDataFixedLayout}
        data-instrument-console={channel}
        data-testid={testId}
      >
        {/* Window Bar / Titlebar */}
        <header className="kde-window-shell__windowbar">
          <span className="kde-window-shell__mark" aria-hidden="true">
            {mark}
          </span>
          <div className="kde-window-shell__heading">
            <h3 className="kde-window-shell__title">{title}</h3>
            {eyebrow && (
              <span className="kde-window-shell__context">{eyebrow}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="kde-window-shell__mode" aria-hidden="true">
              {modeTag}
            </span>
            {canExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  expandable?.toggleExpanded();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="cursor-pointer rounded-md border border-border/80 bg-surface/80 px-2 py-0.5 text-xs font-medium text-muted transition hover:border-accent hover:bg-accent/15 hover:text-accent active:scale-95"
                aria-label="展开全屏演示"
                title="展开全屏演示"
              >
                ⛶ 展开
              </button>
            )}
          </div>
        </header>

        {/* Workspace Interior */}
        <div className="kde-window-shell__workspace">
          <InteractiveLayout
            preset={layoutPreset}
            top={
              tabs ? (
                <nav
                  className="kde-window-shell__tabs-bar"
                  aria-label={`${title} 模式`}
                >
                  {tabs}
                </nav>
              ) : undefined
            }
            navigation={navigation}
            main={
              children ??
              (display ? (
                <div
                  className="kde-window-shell__display"
                  aria-label={`${title} 显示区`}
                >
                  {display}
                </div>
              ) : (
                <div
                  className="kde-window-shell__display"
                  aria-label={`${title} 显示区`}
                />
              ))
            }
            secondary={secondary}
            side={
              controls ? (
                <aside
                  className="kde-window-shell__controls-rack"
                  aria-label={`${title} 控制面板`}
                >
                  {controls}
                </aside>
              ) : undefined
            }
            bottom={
              bottomContent ? (
                <div
                  className="kde-window-shell__readouts"
                  aria-label={`${title} 分析读数`}
                >
                  {bottomContent}
                </div>
              ) : undefined
            }
          />
        </div>
      </section>
    </AutoMath>
  );
}
