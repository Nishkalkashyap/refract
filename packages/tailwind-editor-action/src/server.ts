import type { ToolServerOperationHandler } from "@refract/tool-contracts";

import { updateClassNameInFile } from "./update-classname.ts";

const updateClassNameOperation: ToolServerOperationHandler = async ({
  selection,
  input,
  absoluteFilePath
}) => {
  if (!/\.(tsx|jsx)$/.test(absoluteFilePath)) {
    return {
      ok: false,
      code: "UNSUPPORTED_FILE",
      message: "Only JSX/TSX files are supported.",
      status: 400
    };
  }

  const nextClassName = getNextClassName(input);
  if (nextClassName === null) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Expected input.nextClassName to be a string.",
      status: 400
    };
  }

  return updateClassNameInFile({
    absoluteFilePath,
    line: selection.line,
    ...(typeof selection.column === "number" ? { column: selection.column } : {}),
    nextClassName
  });
};

export const tailwindEditorServerOperations: Record<string, ToolServerOperationHandler> = {
  updateClassName: updateClassNameOperation
};

function getNextClassName(input: unknown): string | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const candidate = (input as { nextClassName?: unknown }).nextClassName;
  return typeof candidate === "string" ? candidate : null;
}
