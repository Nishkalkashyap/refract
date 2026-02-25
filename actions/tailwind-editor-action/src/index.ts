import { createRequire } from "node:module";

import type { ToolActionRegistration } from "@refract/tool-contracts";

import { tailwindEditorServerOperations } from "./server.ts";

const require = createRequire(import.meta.url);
const ACTION_ID = "tailwind-editor";

export const tailwindEditorActionRegistration: ToolActionRegistration = {
  id: ACTION_ID,
  runtimeImport: {
    module: toPosixPath(require.resolve("./runtime.tsx")),
    exportName: "tailwindEditorRuntimeAction"
  },
  serverOperations: tailwindEditorServerOperations
};

export { tailwindEditorServerOperations };

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}
