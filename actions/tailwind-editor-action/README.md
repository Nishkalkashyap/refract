# @nkstack/refract-tailwind-editor-action

Tailwind class editor action for Refract.

Exports split plugin pieces for the unified contract:

- `tailwindEditorRuntimePlugin`
- `tailwindEditorServerPlugin`
- `tailwindEditorPluginBundle`

Use framework-specific entrypoints when you only need one side:

- runtime-only: `@nkstack/refract-tailwind-editor-action/runtime`
- server-only: `@nkstack/refract-tailwind-editor-action/server`

## Install

```bash
pnpm add @nkstack/refract-tailwind-editor-action
```

## Behavior

- Opens a panel on element selection
- Applies optimistic preview (`element.className = next`)
- Debounces persistence calls to server handler
- Updates static JSX `className` via AST transform

## Limitation

Dynamic `className` expressions are rejected.

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
