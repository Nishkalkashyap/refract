import { tailwindEditorRuntimePlugin } from "@nkstack/refract-tailwind-editor-action/runtime";
import { createRefractRegistry } from "@nkstack/refract-tool-contracts";

import { DEFAULT_REFRACT_PLUGIN_ID } from "./refract-constants";

export const refractRuntimeRegistry = createRefractRegistry({
  plugins: [{ runtime: tailwindEditorRuntimePlugin }],
  defaultPluginId: DEFAULT_REFRACT_PLUGIN_ID
});
