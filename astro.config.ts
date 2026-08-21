// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import remarkKatex from "./src/plugins/remark-katex";
import remarkAlerts from "./src/plugins/remark-alerts";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],

  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkKatex, remarkAlerts],
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
  },

  server: {
    port: 51730,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
