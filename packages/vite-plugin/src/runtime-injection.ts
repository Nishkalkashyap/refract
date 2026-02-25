import type { ToolRuntimeBootstrapPayload } from "@refract/tool-contracts";
import type { HtmlTagDescriptor } from "vite";

export function createRuntimeInjectionTag(
  payload: ToolRuntimeBootstrapPayload,
  bootstrapModule: string
): HtmlTagDescriptor {
  return {
    tag: "script",
    attrs: {
      type: "module"
    },
    children: `
import { bootstrapToolRuntime } from ${JSON.stringify(bootstrapModule)};

if (!window.__REFRACT_TOOL_RUNTIME_ENTRY__) {
  window.__REFRACT_TOOL_RUNTIME_ENTRY__ = true;
  void bootstrapToolRuntime(${JSON.stringify(payload)});
}
`,
    injectTo: "body"
  };
}
