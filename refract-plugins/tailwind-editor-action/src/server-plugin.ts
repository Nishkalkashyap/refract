import type { RefractServerPlugin } from "@nkstack/refract-tool-contracts";

import { tailwindEditorServerHandler } from "./server.js";
import type { TailwindEditorInvokePayload } from "./types.js";

export const tailwindEditorServerPlugin: RefractServerPlugin<TailwindEditorInvokePayload> = {
  id: "tailwind-editor",
  serverHandler: tailwindEditorServerHandler
};
