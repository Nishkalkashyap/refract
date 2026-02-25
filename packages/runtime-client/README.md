# @nkstack/refract-runtime-client

Browser runtime UI for Refract.

This package renders selection mode, overlay, action menu, and plugin panels in a Shadow DOM host.

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
