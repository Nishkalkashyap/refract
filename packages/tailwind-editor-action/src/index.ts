import type { ToolAction } from "@refract/runtime-client";

export const tailwindEditorAction: ToolAction = {
  id: "tailwind-editor",
  label: "Tailwind Editor",
  run() {
    // Runtime client handles this action id with a built-in editor flow.
  }
};
