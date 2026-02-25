import type { ToolAction } from "@refract/runtime-client";

export const dummyAction: ToolAction = {
  id: "dummy",
  label: "Log Action",
  run({ file, line, element }) {
    console.log(
      `action taken on ${element.tagName.toLowerCase()} element with file ${file}, line number ${line}`
    );
  }
};
