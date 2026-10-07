import type { editor } from "monaco-editor";

export type ThemeMode = "dark" | "light";

export type EditorThemeSetting = "vs-native" | "bluloco" | "high-contrast";

export interface ThemeMeta {
  id: string;
  name: string;
  mode: ThemeMode;
  editorBg: string;
  editorFg: string;
}

export interface ThemeDefinition {
  meta: ThemeMeta;
  data: editor.IStandaloneThemeData;
}
