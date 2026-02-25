import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dummyActionRegistration } from "@refract/dummy-action";
import { tailwindEditorActionRegistration } from "@refract/tailwind-editor-action";
import { toolPlugin } from "@refract/vite-plugin";

export default defineConfig({
  plugins: [
    toolPlugin({
      actions: [tailwindEditorActionRegistration, dummyActionRegistration],
      defaultActionId: "tailwind-editor"
    }),
    react()
  ]
});
