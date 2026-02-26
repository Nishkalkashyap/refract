# @nkstack/refract-runtime-client

Browser runtime UI for Refract.

This package renders selection mode, overlay, and action menu in a runtime ShadowRoot.
Each plugin panel is mounted in its own dedicated ShadowRoot.

## Install

```bash
pnpm add @nkstack/refract-runtime-client
```

## Exports

- `initToolRuntime(...)`
- `RefractBootstrap` React component

## Usage

```tsx
import { RefractBootstrap } from "@nkstack/refract-runtime-client";

<RefractBootstrap
  plugins={runtimePlugins}
  defaultPluginId="tailwind-editor"
  serverEndpoint="/api/refract/plugin"
/>;
```

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
