import { useEffect, useState } from "react";
import type { EditorThemeSetting } from "../editor/types";

export interface GfxSettings {
  editorTheme: EditorThemeSetting;
  editorFontSize: 12 | 13 | 14;
  editorLineNumbers: boolean;
  editorMinimap: boolean;
  editorTabSize: 2 | 4;
  siteAppearance: "auto" | "light" | "dark";
}

export const DEFAULT_SETTINGS: GfxSettings = {
  editorTheme: "vs-native",
  editorFontSize: 12,
  editorLineNumbers: true,
  editorMinimap: false,
  editorTabSize: 2,
  siteAppearance: "auto",
};

const SETTINGS_KEY = "gfxvis_settings";

export function getSettings(): GfxSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GfxSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent<GfxSettings>("gfx:settings-change", {
        detail: settings,
      }),
    );
  } catch {
    // Ignore storage quota or permission errors
  }
}

export function updateSettings(partial: Partial<GfxSettings>): GfxSettings {
  const current = getSettings();
  const next: GfxSettings = { ...current, ...partial };
  saveSettings(next);
  return next;
}

export function resetSettings(): GfxSettings {
  const next = { ...DEFAULT_SETTINGS };
  saveSettings(next);
  return next;
}

/**
 * React Hook 监听全站设置变更
 */
export function useGfxSettings(): {
  settings: GfxSettings;
  update: (partial: Partial<GfxSettings>) => void;
  reset: () => void;
} {
  const [settings, setSettings] = useState<GfxSettings>(() => getSettings());

  useEffect(() => {
    // 首次挂载时从 localStorage 同步最新设置
    setSettings(getSettings());

    function handleSettingsChange(e: Event) {
      const customEvent = e as CustomEvent<GfxSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getSettings());
      }
    }

    window.addEventListener("gfx:settings-change", handleSettingsChange);
    return () => {
      window.removeEventListener("gfx:settings-change", handleSettingsChange);
    };
  }, []);

  return {
    settings,
    update: updateSettings,
    reset: resetSettings,
  };
}
