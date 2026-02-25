# @nkstack/refract-vite-plugin

Vite integration for Refract.

This plugin handles:

- JSX source metadata instrumentation
- dev server bridge endpoint for server plugins

Runtime UI bootstrap is explicit in app code via `@nkstack/refract-runtime-client`.

## Install

```bash
pnpm add -D @nkstack/refract-vite-plugin
```

## Usage

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { refract } from "@nkstack/refract-vite-plugin";

export default defineConfig({
  plugins: [
    refract({
      serverPlugins: []
    }),
    react()
  ]
});
```

## API

```ts
interface RefractVitePluginOptions {
  serverPlugins: RefractServerPlugin[];
  endpoint?: string; // default "/api/refract/plugin"
}

function refract(options: RefractVitePluginOptions): Plugin;
```

## Notes

- Dev-only (`apply: "serve"`)
- Default bridge endpoint: `POST /api/refract/plugin`

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
