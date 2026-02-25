import { tailwindEditorPluginBundle } from "@nkstack/refract-tailwind-editor-action";
import { createRefractRegistry } from "@nkstack/refract-tool-contracts";

import { DEFAULT_REFRACT_PLUGIN_ID } from "./src/refract-constants";

export const refractRegistry = createRefractRegistry({
  plugins: [tailwindEditorPluginBundle],
  defaultPluginId: DEFAULT_REFRACT_PLUGIN_ID
});
