import type * as monaco from "monaco-editor";
import type { EditorThemeSetting, ThemeDefinition } from "./types";

export const blulocoDark: ThemeDefinition = {
  meta: {
    id: "bluloco-dark",
    name: "Bluloco Dark",
    mode: "dark",
    editorBg: "#282c34",
    editorFg: "#abb2bf",
  },
  data: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "636d83", fontStyle: "italic" },
      { token: "keyword", foreground: "10b1fe", fontStyle: "bold" },
      { token: "keyword.control", foreground: "ff6480", fontStyle: "bold" },
      { token: "storage", foreground: "10b1fe" },
      { token: "storage.type", foreground: "10b1fe" },
      { token: "type", foreground: "ff6480" },
      { token: "type.identifier", foreground: "ff6480" },
      { token: "class", foreground: "ff6480" },
      { token: "entity.name.function", foreground: "3fc56b" },
      { token: "function", foreground: "3fc56b" },
      { token: "string", foreground: "f9c859" },
      { token: "string.escape", foreground: "ff936a" },
      { token: "number", foreground: "ff78f8" },
      { token: "constant", foreground: "9f7efe" },
      { token: "delimiter", foreground: "7a82da" },
      { token: "delimiter.bracket", foreground: "7a82da" },
      { token: "delimiter.parenthesis", foreground: "7a82da" },
      { token: "operator", foreground: "7a82da" },
      { token: "identifier", foreground: "abb2bf" },
      { token: "variable", foreground: "abb2bf" },
      { token: "variable.parameter", foreground: "8bcdef" },
      { token: "variable.other.property", foreground: "ce9887" },
      { token: "tag", foreground: "3691ff" },
      { token: "attribute", foreground: "ff936a" },
      { token: "keyword.directive", foreground: "10b1fe", fontStyle: "bold" },
      { token: "string.include.identifier", foreground: "f9c859" },
      { token: "annotation", foreground: "ff936a", fontStyle: "italic" },
      { token: "invalid", foreground: "fc2f52" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorCursor.foreground": "#ffcc00",
      "editor.lineHighlightBackground": "#2d333d",
      "editorLineNumber.foreground": "#636d83",
      "editorLineNumber.activeForeground": "#ffcc00",
      "editor.selectionBackground": "#0084ff4b",
      "editor.selectionHighlightBackground": "#ffffff1a",
      "editorIndentGuide.background1": "#3d434f",
      "editorIndentGuide.activeBackground1": "#565e6e",
      "editorWidget.background": "#22252a",
      "editorWidget.foreground": "#abb2bf",
      "editorWidget.border": "#636d83",
    },
  },
};

export const blulocoLight: ThemeDefinition = {
  meta: {
    id: "bluloco-light",
    name: "Bluloco Light",
    mode: "light",
    editorBg: "#f9f9f9",
    editorFg: "#383a42",
  },
  data: {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "a0a1a7", fontStyle: "italic" },
      { token: "keyword", foreground: "0098dd", fontStyle: "bold" },
      { token: "keyword.control", foreground: "d52753", fontStyle: "bold" },
      { token: "storage", foreground: "0098dd" },
      { token: "storage.type", foreground: "0098dd" },
      { token: "type", foreground: "d52753" },
      { token: "type.identifier", foreground: "d52753" },
      { token: "class", foreground: "d52753" },
      { token: "entity.name.function", foreground: "23974a" },
      { token: "function", foreground: "23974a" },
      { token: "string", foreground: "c5a332" },
      { token: "string.escape", foreground: "df631c" },
      { token: "number", foreground: "ce33c0" },
      { token: "constant", foreground: "823ff1" },
      { token: "delimiter", foreground: "7a82da" },
      { token: "delimiter.bracket", foreground: "7a82da" },
      { token: "delimiter.parenthesis", foreground: "7a82da" },
      { token: "operator", foreground: "7a82da" },
      { token: "identifier", foreground: "383a42" },
      { token: "variable", foreground: "383a42" },
      { token: "variable.parameter", foreground: "40B8C5" },
      { token: "variable.other.property", foreground: "a05a48" },
      { token: "tag", foreground: "275fe4" },
      { token: "attribute", foreground: "df631c" },
      { token: "keyword.directive", foreground: "0098dd", fontStyle: "bold" },
      { token: "string.include.identifier", foreground: "c5a332" },
      { token: "annotation", foreground: "df631c", fontStyle: "italic" },
      { token: "invalid", foreground: "ff0000" },
    ],
    colors: {
      "editor.background": "#f9f9f9",
      "editor.foreground": "#383a42",
      "editorCursor.foreground": "#f31459",
      "editor.lineHighlightBackground": "#f1f1f1",
      "editorLineNumber.foreground": "#a0a1a7",
      "editorLineNumber.activeForeground": "#f31459",
      "editor.selectionBackground": "#d2ecff",
      "editor.selectionHighlightBackground": "#383a4213",
      "editorIndentGuide.background1": "#d5d7d8",
      "editorIndentGuide.activeBackground1": "#c2c4c7",
      "editorWidget.background": "#ffffff",
      "editorWidget.foreground": "#383a42",
      "editorWidget.border": "#d5d7d8",
    },
  },
};

let themesRegistered = false;

export function registerAllThemes(monacoInstance: typeof monaco) {
  if (themesRegistered) return;
  monacoInstance.editor.defineTheme("bluloco-dark", blulocoDark.data);
  monacoInstance.editor.defineTheme("bluloco-light", blulocoLight.data);
  themesRegistered = true;
}

export function resolveMonacoTheme(
  themeSetting: EditorThemeSetting,
  isDark: boolean,
): string {
  switch (themeSetting) {
    case "bluloco":
      return isDark ? "bluloco-dark" : "bluloco-light";
    case "high-contrast":
      return isDark ? "hc-black" : "hc-light";
    case "vs-native":
    default:
      return isDark ? "vs-dark" : "vs";
  }
}
