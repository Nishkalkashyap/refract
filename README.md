# Refract

Refract is a development-only visual design mode for React + Vite apps.

It lets you pick rendered elements in the browser, map them back to source (`file + line + column`), and run extensible actions on them. The current built-in actions include:

- `tailwind-editor`: opens an editor panel for class updates
- `dummy`: logs selected element metadata

## What It Does

- Injects source metadata into JSX elements during Vite dev transforms
- Injects an inline runtime bootstrap script into dev HTML
- Provides selection mode with hover highlight + right-click action menu
- Supports command and panel-style actions
- Supports action-driven server operations through a generic dev bridge (`POST /@tool/action`)
- Persists Tailwind class updates to source files via AST-based edits

## Key Characteristics

- Development mode only (`apply: "serve"` in Vite plugin)
- No production injection or runtime overhead in build output
- Extensible action system via explicit plugin registration
- Shared contracts package to keep runtime/plugin/action APIs aligned

## Repository Layout

- `apps/vite-example-app`: demo app using the plugin
- `packages/vite-plugin`: Vite plugin (JSX instrumentation + runtime injection + action bridge)
- `packages/runtime-client`: React runtime UI (FAB, overlay, menu, panel host)
- `packages/tool-contracts`: shared action/runtime/server contracts
- `actions/dummy-action`: command action example
- `actions/tailwind-editor-action`: panel action + server operation example

## Quick Start

```bash
pnpm install
pnpm dev
```

Then open the app URL shown by Vite.

## How To Use

1. Click the floating `Select` button.
2. Hover elements to see source mapping overlay.
3. Left click to run the default action.
4. Right click to choose any registered action.
5. For `Tailwind Editor`, edit classes and watch updates persist back to source.

## Registering Actions

Actions are registered explicitly in Vite config:

```ts
import { dummyActionRegistration } from "@refract/dummy-action";
import { tailwindEditorActionRegistration } from "@refract/tailwind-editor-action";
import { toolPlugin } from "@refract/vite-plugin";

toolPlugin({
  actions: [tailwindEditorActionRegistration, dummyActionRegistration],
  defaultActionId: "tailwind-editor"
});
```

Each action package exports a `ToolActionRegistration` that points to:

- runtime action module and export (`runtimeModule`, `runtimeExport`)
- optional server operation handlers

## Current Scope

- Optimized for JSX/TSX in Vite dev mode
- Tailwind editor currently targets static `className` updates
- Dynamic class expressions are intentionally rejected with a clear error
