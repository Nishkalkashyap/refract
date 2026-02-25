import type { ToolRuntimeCommandAction } from "@refract/tool-contracts";

export const dummyRuntimeAction: ToolRuntimeCommandAction = {
  id: "dummy",
  label: "Log Action",
  type: "command",
  run({ selection }) {
    console.log(
      `action taken on ${selection.tagName} element with file ${selection.file}, line number ${selection.line}`
    );
  }
};
