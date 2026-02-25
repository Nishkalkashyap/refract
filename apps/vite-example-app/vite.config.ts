import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { refract } from "@nkstack/refract-vite-plugin";

import { refractRegistry } from "./refract-registry";

export default defineConfig({
  plugins: [
    refract({
      serverPlugins: refractRegistry.serverPlugins
    }),
    react()
  ]
});
