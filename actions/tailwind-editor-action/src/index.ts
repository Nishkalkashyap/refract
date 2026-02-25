import type { RefractPluginBundle } from "@nkstack/refract-tool-contracts";

export { tailwindEditorRuntimePlugin } from "./runtime.ts";
export { tailwindEditorServerPlugin } from "./server-plugin.ts";

import { tailwindEditorRuntimePlugin } from "./runtime.ts";
import { tailwindEditorServerPlugin } from "./server-plugin.ts";
import type { TailwindEditorInvokePayload } from "./types";

export const tailwindEditorPluginBundle: RefractPluginBundle<TailwindEditorInvokePayload> = {
  runtime: tailwindEditorRuntimePlugin,
  server: tailwindEditorServerPlugin
};
