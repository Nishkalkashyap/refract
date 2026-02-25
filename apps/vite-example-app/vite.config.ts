import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dummyPlugin } from "@refract/dummy-action";
import { tailwindEditorPlugin } from "@refract/tailwind-editor-action";
import { refract } from "@refract/vite-plugin";

export default defineConfig({
  plugins: [
    refract({
      plugins: [tailwindEditorPlugin, dummyPlugin],
      defaultPluginId: "tailwind-editor"
    }),
    react()
  ]
});
