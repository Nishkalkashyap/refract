# Refract

Refract is a development-only visual design mode for React + Vite apps.

It lets you pick rendered elements in the browser, map them back to source (`file + line + column`), and run extensible plugins on them. The current built-in plugins include:

- `tailwind-editor`: opens an editor panel for class updates

## What It Does

- Injects source metadata into JSX elements during Vite dev transforms
- Injects an inline runtime bootstrap script into dev HTML
- Provides selection mode with hover highlight + right-click plugin menu
- Supports plugin-owned browser handlers and optional panel UI
- Supports plugin-driven server handlers through a generic dev bridge (`POST /@refract/plugin`)
- Persists Tailwind class updates to source files via AST-based edits

## Key Characteristics

- Development mode only (`apply: "serve"` in Vite plugin)
- No production injection or runtime overhead in build output
- Extensible plugin system via explicit plugin registration
- Shared contracts package to keep runtime/plugin/server APIs aligned

## Repository Layout

- `apps/vite-example-app`: demo app using Refract
- `packages/vite-plugin`: Vite plugin (JSX instrumentation + runtime injection + plugin bridge)
- `packages/runtime-client`: React runtime UI (FAB, overlay, menu, panel host)
- `packages/tool-contracts`: shared plugin/runtime/server contracts
- `actions/tailwind-editor-action`: panel plugin + server handler example

## Quick Start

```bash
pnpm install
pnpm dev
```

Then open the app URL shown by Vite.

## How To Use

1. Click the floating `Select` button.
2. Hover elements to see source mapping overlay.
3. Left click to run the default plugin.
4. Right click to choose any registered plugin.
5. For `Tailwind Editor`, edit classes and watch updates persist back to source.

## Registering Plugins

Plugins are registered explicitly in Vite config:

```ts
import { tailwindEditorPlugin } from "@nkstack/refract-tailwind-editor-action";
import { refract } from "@nkstack/refract-vite-plugin";

refract({
  plugins: [tailwindEditorPlugin],
  defaultPluginId: "tailwind-editor"
});
```

## Plugin API

Public plugin shape:

```ts
interface RefractPlugin {
  id: string;
  label: string;
  inBrowserHandler: (ctx: RefractBrowserContext) => void | Promise<void>;
  serverHandler?: (ctx: RefractServerContext) => RefractServerResult | Promise<RefractServerResult>;
  Panel?: (props: RefractPanelProps) => unknown;
}
```

Plugin packages should export a `RefractPlugin` from their package entrypoint.

## Current Scope

- Optimized for JSX/TSX in Vite dev mode
- Tailwind editor currently targets static `className` updates
- Dynamic class expressions are intentionally rejected with a clear error

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
