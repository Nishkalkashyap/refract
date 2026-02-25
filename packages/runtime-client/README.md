# @nkstack/refract-runtime-client

Browser runtime for Refract.

This package renders the in-browser UI (selection mode, overlay, action menu, panel host) and executes registered Refract plugins.

## Install

```bash
pnpm add @nkstack/refract-runtime-client
```

## Intended Use

Most apps should not use this package directly. It is typically bootstrapped by `@nkstack/refract-vite-plugin`.

## Exports

- `@nkstack/refract-runtime-client`
  - runtime entry (`initToolRuntime`)
- `@nkstack/refract-runtime-client/bootstrap`
  - bootstrap entry (`bootstrapToolRuntime`)

## Notes

- React + Shadow DOM runtime host
- Designed for development mode workflows

## Disclaimer

> Most of the code in this repository was generated with AI assistance.
> All generated output was reviewed and supervised by humans.
