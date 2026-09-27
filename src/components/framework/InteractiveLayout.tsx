import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import "./InteractiveLayout.css";

export type InteractiveLayoutPreset =
  | "side-right"
  | "bottom-split"
  | "three-column"
  | "dense-dock"
  | "dual-view"
  | "side-left";

export interface InteractiveLayoutProps {
  preset: InteractiveLayoutPreset;
  main: ReactNode;
  top?: ReactNode;
  navigation?: ReactNode;
  secondary?: ReactNode;
  side?: ReactNode;
  bottom?: ReactNode;
  footer?: ReactNode;
  className?: string;
  testId?: string;
}

const regions = [
  ["top", "top"],
  ["navigation", "navigation"],
  ["main", "main"],
  ["secondary", "secondary"],
  ["side", "side"],
  ["bottom", "bottom"],
  ["footer", "footer"],
] as const;

type InteractiveLayoutStyle = CSSProperties & {
  "--interactive-desktop-areas": string;
  "--interactive-mobile-areas": string;
};

function areaTemplate(
  preset: InteractiveLayoutPreset,
  present: Set<string>,
): InteractiveLayoutStyle {
  const columns =
    preset === "three-column" || preset === "dual-view"
      ? 3
      : preset === "dense-dock"
        ? 1
        : 2;
  const row = (...names: string[]) => {
    const cells = names.slice(0, columns);
    while (cells.length < columns) cells.push(".");
    return `"${cells.join(" ")}"`;
  };
  const rows: string[] = [];
  const full = (name: string) =>
    row(
      ...Array.from({ length: columns }, () =>
        present.has(name) ? name : ".",
      ),
    );
  if (present.has("top")) rows.push(full("top"));
  if (preset === "side-right") {
    if (present.has("main") && present.has("side"))
      rows.push(row("main", "side"));
    else if (present.has("main")) rows.push(row("main", "main"));
    else if (present.has("side")) rows.push(row("side", "side"));
  } else if (preset === "bottom-split") {
    if (present.has("main")) rows.push(full("main"));
    if (present.has("bottom") && present.has("side"))
      rows.push(row("bottom", "side"));
    else if (present.has("bottom")) rows.push(row("bottom", "bottom"));
    else if (present.has("side")) rows.push(row("side", "side"));
  } else if (preset === "three-column") {
    const hasNav = present.has("navigation");
    const hasMain = present.has("main");
    const hasSide = present.has("side");
    if (hasNav && hasMain && hasSide) {
      rows.push(row("navigation", "main", "side"));
    } else if (hasMain && hasSide) {
      rows.push(row("main", "main", "side"));
    } else if (hasNav && hasMain) {
      rows.push(row("navigation", "main", "main"));
    } else if (hasMain) {
      rows.push(full("main"));
    } else if (hasSide) {
      rows.push(full("side"));
    }
  } else if (preset === "dense-dock") {
    if (present.has("main")) rows.push(row("main"));
    if (present.has("side")) rows.push(row("side"));
  } else if (preset === "dual-view") {
    const hasMain = present.has("main");
    const hasSecondary = present.has("secondary");
    const hasSide = present.has("side");
    if (hasMain && hasSecondary && hasSide) {
      rows.push(row("main", "secondary", "side"));
    } else if (hasMain && hasSecondary) {
      rows.push(row("main", "secondary", "secondary"));
    } else if (hasMain && hasSide) {
      rows.push(row("main", "main", "side"));
    } else if (hasMain) {
      rows.push(full("main"));
    } else if (hasSide) {
      rows.push(full("side"));
    }
    if (present.has("bottom") && hasSide) {
      rows.push(row("bottom", "bottom", "side"));
    } else if (present.has("bottom")) {
      rows.push(full("bottom"));
    }
  } else {
    if (present.has("main") && present.has("side"))
      rows.push(row("side", "main"));
    else if (present.has("main")) rows.push(row("main", "main"));
    else if (present.has("side")) rows.push(row("side", "side"));
  }
  if (
    present.has("bottom") &&
    preset !== "bottom-split" &&
    preset !== "dual-view"
  )
    rows.push(full("bottom"));
  if (present.has("footer")) rows.push(full("footer"));
  const mobileRows = regions
    .map(([region]) => region)
    .filter((region) => present.has(region))
    .map((region) => `"${region}"`)
    .join(" ");
  return {
    "--interactive-desktop-areas": rows.join(" "),
    "--interactive-mobile-areas": mobileRows,
  };
}

export default function InteractiveLayout({
  preset,
  main,
  top,
  navigation,
  secondary,
  side,
  bottom,
  footer,
  className = "",
  testId,
}: InteractiveLayoutProps) {
  // Only permit regions valid for the active preset
  const effectiveSecondary = preset === "dual-view" ? secondary : undefined;
  const effectiveNavigation =
    preset === "three-column" ? navigation : undefined;

  const content: Record<string, ReactNode | undefined> = {
    top,
    navigation: effectiveNavigation,
    main,
    secondary: effectiveSecondary,
    side,
    bottom,
    footer,
  };
  const present = new Set(
    Object.entries(content)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([region]) => region),
  );

  return (
    <section
      className={`interactive-layout interactive-layout--${preset} ${className}`.trim()}
      data-layout-preset={preset}
      data-testid={testId}
      style={areaTemplate(preset, present)}
    >
      {regions.map(([region, label]) => {
        const value = content[region];
        if (value === undefined || value === null) return null;
        return (
          <div
            key={region}
            className={`interactive-layout__region interactive-layout__region--${region}`}
            data-layout-region={region}
            aria-label={label}
          >
            {value}
          </div>
        );
      })}
    </section>
  );
}
