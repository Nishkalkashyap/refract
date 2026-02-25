import type { RefractServerPlugin } from "@nkstack/refract-tool-contracts";

import { tailwindEditorServerHandler } from "./server.ts";
import type { TailwindEditorInvokePayload } from "./types";

export const tailwindEditorServerPlugin: RefractServerPlugin<TailwindEditorInvokePayload> = {
  id: "tailwind-editor",
  serverHandler: tailwindEditorServerHandler
};
