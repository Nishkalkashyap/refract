import type { RefractPluginBundle } from "@nkstack/refract-tool-contracts";

export { tailwindEditorRuntimePlugin } from "./runtime.js";
export { tailwindEditorServerPlugin } from "./server-plugin.js";

import { tailwindEditorRuntimePlugin } from "./runtime.js";
import { tailwindEditorServerPlugin } from "./server-plugin.js";
import type { TailwindEditorInvokePayload } from "./types.js";

export const tailwindEditorPluginBundle: RefractPluginBundle<TailwindEditorInvokePayload> = {
  runtime: tailwindEditorRuntimePlugin,
  server: tailwindEditorServerPlugin
};
