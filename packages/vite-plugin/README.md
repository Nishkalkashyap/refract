# @nkstack/refract-vite-plugin

Vite plugin for Refract, a development-only visual design mode for React + Vite apps.

It instruments JSX with source metadata, injects the runtime bootstrap in dev HTML, and exposes the server bridge for plugin `serverHandler` calls.

## Install

```bash
pnpm add -D @nkstack/refract-vite-plugin
```

You will typically also install at least one Refract plugin package.

## Usage

```ts
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
```

## API

```ts
interface RefractVitePluginOptions {
  plugins: RefractPlugin[];
  defaultPluginId?: string;
}

function refract(options: RefractVitePluginOptions): Plugin;
```

## Notes

- Dev-only (`apply: "serve"`)
- No production runtime injection
- Exposes `POST /@refract/plugin` in dev for plugin server invocations

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
