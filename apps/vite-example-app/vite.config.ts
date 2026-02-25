import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { toolPlugin } from "@refract/vite-plugin";

export default defineConfig({
  plugins: [toolPlugin(), react()]
});
