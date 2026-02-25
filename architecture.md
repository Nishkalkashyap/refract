# Architecture Notes

This document describes the technical architecture powering Refract.

## 1. System Overview

Refract is composed of four primary layers:

1. Vite plugin (`@refract/vite-plugin`)
2. Browser runtime (`@refract/runtime-client`)
3. Action modules (`actions/*`)
4. Shared contracts (`@refract/tool-contracts`)

Flow at a high level:

1. Vite plugin instruments JSX with source metadata (`data-tool-file`, `data-tool-line`, `data-tool-column`).
2. Vite plugin injects an inline module script in dev HTML that bootstraps runtime from a manifest.
3. Runtime handles selection UX and dispatches actions.
4. Panel/command actions may call `POST /@tool/action` for server-side operations.
5. Server operation handlers (provided by action modules) mutate source as needed.

## 2. Core Technologies

- Vite plugin hooks: `transform`, `transformIndexHtml`, `configureServer`
- Babel parser/traverse/generator for JSX AST instrumentation and updates
- React + ReactDOM for runtime UI and panel rendering
- TypeScript across all packages with shared contract types
- pnpm workspaces + Turbo monorepo structure

## 3. Shared Contract Layer

`packages/tool-contracts` defines cross-layer interfaces.

Important contract groups:

- Selection model: `ToolSelectionRef`
- Runtime actions:
  - `ToolRuntimeCommandAction`
  - `ToolRuntimePanelAction`
  - `ToolRuntimePanelProps`
- Server bridge:
  - `ToolActionOperationRequest`
  - `ToolActionOperationResult`
  - `ToolServerOperationHandler`
- Registration model: `ToolActionRegistration`

This prevents runtime/plugin/action packages from drifting apart.

## 4. Plugin Architecture

`packages/vite-plugin/src/index.ts` responsibilities:

1. JSX instrumentation (dev only)
- Parses `.jsx/.tsx` modules.
- Adds metadata attributes to JSX opening elements.

2. Runtime injection
- Injects an inline `<script type="module">` in dev HTML.
- Calls `bootstrapToolRuntime(...)` from `@refract/runtime-client/bootstrap`.
- Passes action manifest data (`id`, `runtimeModule`, `runtimeExport`, `defaultActionId`).

3. Generic action bridge
- Exposes `POST /@tool/action`.
- Validates payload:
  - `actionId`
  - `operation`
  - `selection`
  - `input`
- Enforces file path safety (must resolve inside project root).
- Dispatches to action-specific server handlers.

## 5. Runtime Architecture (React)

`packages/runtime-client` is organized into focused modules:

- `ToolRuntimeApp.tsx`: orchestration
- `useSelectionMode.ts`: mouse/click/context/escape selection behavior
- `SelectionOverlay.tsx`: hovered element highlight
- `RuntimeFab.tsx`: select mode toggle
- `ActionMenu.tsx`: right-click action chooser
- `PanelHost.tsx`: renders panel actions
- `useActionExecutor.ts`: unified action invocation logic
- `useToolOperationClient.ts`: typed client for `/@tool/action`
- `runtime-dom.ts`: DOM/metadata extraction utilities
- `runtime-styles.ts`: runtime Shadow DOM styles

Design constraint:
- Runtime core does not hardcode action IDs.
- Runtime branches by action type (`command` vs `panel`).

## 6. Action Module Pattern

Each action module exports a `ToolActionRegistration`:

- `id`
- `runtimeModule`
- `runtimeExport`
- optional `serverOperations`

### Dummy Action

- Runtime type: command
- Behavior: logs selected element + source metadata
- No server operations

### Tailwind Editor Action

- Runtime type: panel
- UI: toolbar adapter component with `value/onChange`
- Client behavior:
  - optimistic preview (`element.className = next`)
  - debounced server operation call (`updateClassName`)
- Server behavior:
  - AST-based update of static `className`
  - inserts `className` if absent
  - rejects dynamic expressions

## 7. Mutation Path and Safety

Mutation requests are action-scoped:

- Endpoint: `POST /@tool/action`
- Handler selected by `actionId + operation`
- Plugin computes absolute path from selection and validates root containment

Typical error responses include:

- `INVALID_PAYLOAD`
- `ACTION_NOT_FOUND`
- `OPERATION_NOT_FOUND`
- `FORBIDDEN_PATH`
- action-specific errors (for example `UNSUPPORTED_DYNAMIC_CLASSNAME`)

## 8. Extensibility Model

To add a new action:

1. Create action package under `actions/<name>`.
2. Implement runtime action (`command` or `panel`).
3. Add optional server operation handlers.
4. Export `ToolActionRegistration`.
5. Register action in app Vite config via `toolPlugin({ actions: [...] })`.

No runtime-core edits are required for standard action additions.

## 9. Current Constraints

- Dev-only architecture (not for production use)
- Current AST writer targets static JSX `className`
- Vite-focused implementation (no Next.js integration yet)
