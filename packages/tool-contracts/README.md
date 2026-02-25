# @nkstack/refract-tool-contracts

Shared type contracts and helpers for the Refract ecosystem.

Use this package when authoring custom Refract plugins so runtime, Vite plugin, and plugin packages stay type-aligned.

## Install

```bash
pnpm add @nkstack/refract-tool-contracts
```

## What It Exposes

- Core plugin types:
  - `RefractPlugin`
  - `RefractRuntimePlugin`
  - `RefractBrowserContext`
  - `RefractServerContext`
  - `RefractServerResult`
- Runtime/bootstrap payload types
- Helpers:
  - `defineRefractBrowserPlugin(...)`
  - `withRefractServerHandler(...)`

## Example

```ts
import {
  defineRefractBrowserPlugin,
  withRefractServerHandler,
  type RefractPlugin
} from "@nkstack/refract-tool-contracts";

const browserPlugin = defineRefractBrowserPlugin(import.meta.url, {
  id: "my-plugin",
  label: "My Plugin",
  inBrowserHandler({ ui }) {
    ui.openPanel();
  }
});

export const myPlugin: RefractPlugin = withRefractServerHandler(
  browserPlugin,
  async ({ payload }) => {
    return { ok: true, data: payload };
  }
);
```

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
