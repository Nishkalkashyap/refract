import type { ToolActionRegistration } from "@refract/tool-contracts";

const ACTION_ID = "dummy";

export const dummyActionRegistration: ToolActionRegistration = {
  id: ACTION_ID,
  runtimeModule: "@refract/dummy-action/runtime",
  runtimeExport: "dummyRuntimeAction"
};
