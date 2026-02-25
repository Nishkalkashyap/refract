import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tailwindEditorPlugin } from "@nkstack/refract-tailwind-editor-action";
import { refract } from "@nkstack/refract-vite-plugin";

export default defineConfig({
  plugins: [
    refract({
      plugins: [tailwindEditorPlugin],
      defaultPluginId: "tailwind-editor"
    }),
    react()
  ]
});
