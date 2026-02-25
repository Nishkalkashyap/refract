import { createRequire } from "node:module";

import type { ToolActionRegistration } from "@refract/tool-contracts";

const require = createRequire(import.meta.url);
const ACTION_ID = "dummy";

export const dummyActionRegistration: ToolActionRegistration = {
  id: ACTION_ID,
  runtimeImport: {
    module: toPosixPath(require.resolve("./runtime.ts")),
    exportName: "dummyRuntimeAction"
  }
};

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}
