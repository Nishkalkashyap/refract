# @nkstack/refract-tailwind-editor-action

Refract plugin that opens a Tailwind class editor panel for selected JSX elements.

It previews class updates in the browser and persists changes to source files through the Refract server bridge.

## Install

```bash
pnpm add @nkstack/refract-tailwind-editor-action
```

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

## Behavior

- Opens a panel on element selection
- Applies optimistic preview (`element.className = next`)
- Debounces persistence calls to the server handler
- Updates static JSX `className` via AST transform

## Current Limitations

- Supports JSX/TSX files
- Dynamic `className` expressions are rejected

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
