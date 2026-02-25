import type { ToolActionRegistration } from "@refract/tool-contracts";

import { tailwindEditorServerOperations } from "./server.ts";

const ACTION_ID = "tailwind-editor";

export const tailwindEditorActionRegistration: ToolActionRegistration = {
  id: ACTION_ID,
  runtimeModule: "@refract/tailwind-editor-action/runtime",
  runtimeExport: "tailwindEditorRuntimeAction",
  serverOperations: tailwindEditorServerOperations
};

export { tailwindEditorServerOperations };
