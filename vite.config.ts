import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "editor-core": [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/language",
          ],
          "editor-languages": [
            "@codemirror/lang-javascript",
            "@codemirror/lang-json",
          ],
        },
      },
    },
  },
});
