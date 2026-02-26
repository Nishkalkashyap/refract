# @nkstack/refract-tool-contracts

Shared Refract contracts for runtime plugins, server plugins, and server bridge payloads.

## Install

```bash
pnpm add @nkstack/refract-tool-contracts
```

## Main Types

- `RefractRuntimePlugin`
- `RefractServerPlugin`
- `RefractPluginBundle`
- `RefractPluginRegistry`
- `RefractBrowserContext`
- `RefractServerContext`
- `RefractServerResult`

## Runtime Plugin Notes

- `onSelect` controls selection behavior (`"open-panel"` or `"none"`).
- `panelStyles` accepts CSS text strings injected into the plugin panel ShadowRoot.
- Plugin panels receive `portalContainer` and `shadowRoot` in `RefractPanelProps`.

## Registry Helper

```ts
import { createRefractRegistry } from "@nkstack/refract-tool-contracts";

const registry = createRefractRegistry({
  plugins: [
    {
      runtime: runtimePlugin,
      server: serverPlugin
    }
  ],
  defaultPluginId: "my-plugin"
});
```

`createRefractRegistry(...)` validates:

- runtime plugin ids are unique and non-empty
- server plugin ids match runtime ids
- `defaultPluginId` exists in runtime plugins

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
