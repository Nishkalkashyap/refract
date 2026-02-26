# Refract

Refract is a development-only visual design mode for React apps.

It maps selected DOM nodes back to source (`file + line + column`) and runs pluggable runtime/server actions against that selection.

## Framework Support

- Vite (dev server plugin + explicit runtime bootstrap)
- Next.js 16 App Router + Turbopack (config plugin + route handler + explicit runtime bootstrap)

## Core Packages

- `@nkstack/refract-tool-contracts`
  - shared runtime/server/plugin contracts
  - registry helper `createRefractRegistry(...)`
- `@nkstack/refract-runtime-client`
  - Refract UI runtime + `<RefractBootstrap />`
- `@nkstack/refract-vite-plugin`
  - JSX instrumentation + dev bridge middleware
- `@nkstack/refract-next-plugin`
  - Turbopack JSX instrumentation + Next route handler helper
- `@nkstack/refract-tailwind-editor-action`
  - example action with panel + source mutation server handler

## Local Examples

- `apps/vite-example-app`
- `apps/next-example-app`

Run:

```bash
pnpm install
pnpm dev
```

Next example:

```bash
pnpm dev:next
```

## Plugin Model

Refract plugins are split by runtime/server concern:

```ts
interface RefractRuntimePlugin {
  id: string;
  label: string;
  onSelect?: "open-panel" | "none" | ((ctx: RefractBrowserContext) => "open-panel" | "none" | Promise<"open-panel" | "none">);
  Panel?: (props: RefractPanelProps) => unknown;
  panelStyles?: string[]; // CSS text injected into plugin panel ShadowRoot
}

interface RefractServerPlugin {
  id: string;
  serverHandler: (ctx: RefractServerContext) => RefractServerResult | Promise<RefractServerResult>;
}
```

Use `createRefractRegistry(...)` with `RefractPluginBundle[]` to derive `runtimePlugins` and `serverPlugins` from one source.

## Default Bridge Endpoint

`POST /api/refract/plugin`

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
