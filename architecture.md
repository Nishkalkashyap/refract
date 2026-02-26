# Architecture Notes

This document describes the technical architecture powering Refract.

## 1. System Overview

Refract is composed of four primary layers:

1. Vite plugin (`@nkstack/refract-vite-plugin`)
2. Browser runtime (`@nkstack/refract-runtime-client`)
3. Plugin modules (`refract-plugins/*`)
4. Shared contracts (`@nkstack/refract-tool-contracts`)

Flow at a high level:

1. Vite plugin instruments JSX with source metadata (`data-tool-file`, `data-tool-line`, `data-tool-column`).
2. Vite plugin injects an inline module script in dev HTML that bootstraps runtime from a plugin manifest.
3. Runtime handles selection UX and dispatches plugin `inBrowserHandler`.
4. Browser plugin code can call `server.invoke(payload)`.
5. Vite plugin bridge dispatches to plugin-specific `serverHandler`.

## 2. Core Technologies

- Vite plugin hooks: `transform`, `transformIndexHtml`, `configureServer`
- Babel parser/traverse/generator for JSX AST instrumentation and source updates
- React + ReactDOM for runtime UI and panel rendering
- TypeScript across all packages with shared contract types
- pnpm workspaces + Turbo monorepo structure

## 3. Shared Contract Layer

`packages/tool-contracts` defines cross-layer interfaces.

Important contract groups:

- Selection model: `RefractSelectionRef`
- Runtime/plugin model:
  - `RefractRuntimePlugin`
  - `RefractBrowserContext`
  - `RefractPanelProps`
- Server bridge:
  - `RefractServerInvokeRequest`
  - `RefractServerResult`
  - `RefractServerContext`
  - `RefractServerHandler`
- Public plugin registration model: `RefractPlugin`

This prevents runtime/plugin/server packages from drifting apart.

## 4. Vite Plugin Architecture

`packages/vite-plugin/src/index.ts` responsibilities:

1. JSX instrumentation (dev only)
- Parses `.jsx/.tsx` modules.
- Adds metadata attributes to JSX opening elements.

2. Runtime injection
- Injects an inline `<script type="module">` in dev HTML.
- Calls `bootstrapToolRuntime(...)` from `@nkstack/refract-runtime-client/bootstrap`.
- Passes plugin manifest data (`id`, `browserModule`, `defaultPluginId`).

3. Generic plugin bridge
- Exposes `POST /@refract/plugin`.
- Validates payload:
  - `pluginId`
  - `selectionRef`
  - `payload`
- Enforces file path safety (must resolve inside project root).
- Builds file context (`absolutePath`, `sourceText`, parsed `ast`, `writeSourceText`).
- Dispatches to plugin-specific `serverHandler`.

## 5. Runtime Architecture (React)

`packages/runtime-client` is organized into focused modules:

- `ToolRuntimeApp.tsx`: orchestration
- `useSelectionMode.ts`: mouse/click/context/escape selection behavior
- `SelectionOverlay.tsx`: hovered element highlight
- `RuntimeFab.tsx`: select mode toggle
- `ActionMenu.tsx`: right-click plugin chooser
- `PanelHost.tsx`: renders plugin panel UI
- `useActionExecutor.ts`: unified plugin invocation logic
- `useToolOperationClient.ts`: typed client for `/@refract/plugin`
- `runtime-dom.ts`: DOM/metadata extraction utilities
- `runtime-styles.ts`: runtime Shadow DOM styles

Design constraints:
- Runtime core does not hardcode plugin IDs.
- Runtime always executes `plugin.inBrowserHandler(...)`.
- Panel rendering is opt-in via `ctx.ui.openPanel()` and plugin `Panel`.

## 6. Plugin Module Pattern

Each plugin package exports a `RefractPlugin` from its package entrypoint.

Typical structure:

1. Browser runtime module (`runtime.ts` / `runtime.tsx`)
- Exports default browser plugin built with:
  - `defineRefractBrowserPlugin(import.meta.url, { ... })`
- Implements:
  - `id`, `label`
  - `inBrowserHandler`
  - optional `Panel`

2. Server module (`server.ts`) (optional)
- Exports `serverHandler` with signature:
  - `(ctx: RefractServerContext<Payload>) => RefractServerResult`

3. Package entrypoint (`index.ts`)
- Exports final plugin, optionally composed with:
  - `withRefractServerHandler(browserPlugin, serverHandler)`

### Tailwind Editor Plugin

- Browser behavior: opens panel
- Panel behavior:
  - optimistic preview (`element.className = next`)
  - debounced `server.invoke({ kind: "updateClassName", nextClassName })`
- Server behavior:
  - AST-based update of static `className`
  - inserts `className` if absent
  - rejects dynamic expressions

## 7. Mutation Path and Safety

Mutation requests are plugin-scoped:

- Endpoint: `POST /@refract/plugin`
- Handler selected by `pluginId`
- Plugin server handler decides behavior using typed `payload.kind`
- Plugin bridge validates source file containment under project root

Typical error responses include:

- `INVALID_PAYLOAD`
- `PLUGIN_NOT_FOUND`
- `SERVER_HANDLER_NOT_FOUND`
- `FORBIDDEN_PATH`
- plugin-specific errors (for example `UNSUPPORTED_DYNAMIC_CLASSNAME`)

## 8. Extensibility Model

To add a new plugin:

1. Create plugin package under `refract-plugins/<name>`.
2. Implement browser plugin (`inBrowserHandler` and optional `Panel`).
3. Add optional `serverHandler`.
4. Export final `RefractPlugin`.
5. Register in app Vite config via `refract({ plugins: [...] })`.

No runtime-core edits are required for standard plugin additions.

## 9. Current Constraints

- Dev-only architecture (not for production use)
- Current AST writer targets static JSX `className`
- Vite-focused implementation (no Next.js integration yet)
