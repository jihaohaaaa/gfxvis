import { useGfxSettings } from "../../lib/settings/settings-store";
import type { EditorThemeSetting } from "../../lib/editor/types";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeSwitch from "../framework/KdeSwitch";

interface SettingsViewProps {
  onClose?: () => void;
}

const THEME_OPTIONS: KdeTabOption<EditorThemeSetting>[] = [
  { id: "vs-native", label: "原生经典 (VS/VS Dark)" },
  { id: "bluloco", label: "Bluloco 高对比" },
  { id: "high-contrast", label: "高对比 (HC)" },
];

const FONT_SIZE_OPTIONS: KdeTabOption<"12" | "13" | "14">[] = [
  { id: "12", label: "12px (紧凑)" },
  { id: "13", label: "13px (默认)" },
  { id: "14", label: "14px (大字)" },
];

const TAB_SIZE_OPTIONS: KdeTabOption<"2" | "4">[] = [
  { id: "2", label: "2 空格" },
  { id: "4", label: "4 空格" },
];

const APPEARANCE_OPTIONS: KdeTabOption<"auto" | "light" | "dark">[] = [
  { id: "auto", label: "跟随系统" },
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
];

export default function SettingsView({ onClose }: SettingsViewProps) {
  const { settings, update, reset } = useGfxSettings();

  function handleAppearanceChange(val: "auto" | "light" | "dark") {
    update({ siteAppearance: val });
    if (typeof window !== "undefined") {
      const docEl = document.documentElement;
      if (val === "dark") {
        docEl.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else if (val === "light") {
        docEl.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        localStorage.removeItem("theme");
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        if (prefersDark) {
          docEl.classList.add("dark");
        } else {
          docEl.classList.remove("dark");
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 模块 1: 代码编辑器偏好 */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>💻</span>
            <span>代码编辑器设置 (Monaco Editor)</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            配置文章交互代码机箱与算法运行器的视图偏好
          </p>
        </div>

        <div className="space-y-4 pl-1">
          {/* 编辑器语法主题 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink block">
              编辑器语法配色主题
            </label>
            <KdeTabs
              options={THEME_OPTIONS}
              value={settings.editorTheme}
              onChange={(t) => update({ editorTheme: t })}
              variant="pill"
              size="xs"
            />
          </div>

          {/* 编辑器字号 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink block">
              字体大小
            </label>
            <KdeTabs
              options={FONT_SIZE_OPTIONS}
              value={String(settings.editorFontSize) as "12" | "13" | "14"}
              onChange={(s) =>
                update({ editorFontSize: parseInt(s, 10) as 12 | 13 | 14 })
              }
              variant="pill"
              size="xs"
            />
          </div>

          {/* 缩进大小 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink block">
              Tab 缩进宽度
            </label>
            <KdeTabs
              options={TAB_SIZE_OPTIONS}
              value={String(settings.editorTabSize) as "2" | "4"}
              onChange={(t) =>
                update({ editorTabSize: parseInt(t, 10) as 2 | 4 })
              }
              variant="pill"
              size="xs"
            />
          </div>

          {/* 开关选项组 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <KdeSwitch
              checked={settings.editorLineNumbers}
              onChange={(val) => update({ editorLineNumbers: val })}
              label="行号显示"
              description="在编辑区左侧呈现行号数字栏"
              size="xs"
            />

            <KdeSwitch
              checked={settings.editorMinimap}
              onChange={(val) => update({ editorMinimap: val })}
              label="右侧缩略图 (Minimap)"
              description="代码较长时在右侧展现全景缩略图"
              size="xs"
            />
          </div>
        </div>
      </section>

      {/* 模块 2: 全站外观与阅读 */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>🎨</span>
            <span>全站外观与阅读</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            全局深浅色色彩主题与页面呈现控制
          </p>
        </div>

        <div className="space-y-2 pl-1">
          <label className="text-xs font-semibold text-ink block">
            色彩外观模式
          </label>
          <KdeTabs
            options={APPEARANCE_OPTIONS}
            value={settings.siteAppearance}
            onChange={handleAppearanceChange}
            variant="pill"
            size="xs"
          />
        </div>
      </section>

      {/* 底部动作栏 */}
      <div className="flex items-center justify-between pt-4 border-t border-border/80">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-border/80 px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-500 transition-colors"
        >
          ↺ 恢复默认设置
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-accent bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
          >
            完成
          </button>
        )}
      </div>
    </div>
  );
}
