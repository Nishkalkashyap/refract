# @nkstack/refract-next-plugin

Next.js 16 integration for Refract development mode.

This package provides:

- `withRefract(...)` for Turbopack JSX instrumentation in `next.config.ts`
- `createRefractRouteHandler(...)` for the server bridge route handler

## Install

```bash
pnpm add -D @nkstack/refract-next-plugin
```

## Usage

```ts
// next.config.ts
import { withRefract } from "@nkstack/refract-next-plugin";

export default withRefract()({
  reactStrictMode: true
});
```

```ts
// app/api/refract/plugin/route.ts
import { createRefractRouteHandler } from "@nkstack/refract-next-plugin/server";
import { tailwindEditorServerPlugin } from "@nkstack/refract-tailwind-editor-action/server";

export const runtime = "nodejs";
export const POST = createRefractRouteHandler({
  serverPlugins: [tailwindEditorServerPlugin]
});
```

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
