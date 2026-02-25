import type { ToolServerOperationHandler } from "@refract/tool-contracts";

import { ClassNameFileUpdater } from "./update-classname.ts";

class TailwindEditorServer {
  private readonly classNameFileUpdater = new ClassNameFileUpdater();

  private readonly handleUpdateClassName: ToolServerOperationHandler = async ({
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

    const nextClassName = this.getNextClassName(input);
    if (nextClassName === null) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "Expected input.nextClassName to be a string.",
        status: 400
      };
    }

    return this.classNameFileUpdater.update({
      absoluteFilePath,
      line: selection.line,
      ...(typeof selection.column === "number" ? { column: selection.column } : {}),
      nextClassName
    });
  };

  readonly operations: Record<string, ToolServerOperationHandler> = {
    updateClassName: this.handleUpdateClassName
  };

  private getNextClassName(input: unknown): string | null {
    if (typeof input !== "object" || input === null) {
      return null;
    }

    const candidate = (input as { nextClassName?: unknown }).nextClassName;
    return typeof candidate === "string" ? candidate : null;
  }
}

export const tailwindEditorServerOperations = new TailwindEditorServer().operations;
