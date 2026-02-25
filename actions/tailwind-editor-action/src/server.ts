import type { RefractServerHandler } from "@nkstack/refract-tool-contracts";

import type { TailwindEditorInvokePayload } from "./types";
import { ClassNameFileUpdater } from "./update-classname.ts";

class TailwindEditorServer {
  private readonly classNameFileUpdater = new ClassNameFileUpdater();

  readonly handler: RefractServerHandler<TailwindEditorInvokePayload> = async ({
    selectionRef,
    payload,
    file
  }) => {
    if (!/\.(tsx|jsx)$/.test(file.absolutePath)) {
      return {
        ok: false,
        code: "UNSUPPORTED_FILE",
        message: "Only JSX/TSX files are supported.",
        status: 400
      };
    }

    if (!this.isInvokePayload(payload)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "Expected payload.kind='updateClassName' and payload.nextClassName as a string.",
        status: 400
      };
    }

    return this.classNameFileUpdater.update({
      absoluteFilePath: file.absolutePath,
      line: selectionRef.line,
      ...(typeof selectionRef.column === "number" ? { column: selectionRef.column } : {}),
      nextClassName: payload.nextClassName
    });
  };

  private isInvokePayload(value: unknown): value is TailwindEditorInvokePayload {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const candidate = value as {
      kind?: unknown;
      nextClassName?: unknown;
    };

    return (
      candidate.kind === "updateClassName" && typeof candidate.nextClassName === "string"
    );
  }
}

export const tailwindEditorServerHandler = new TailwindEditorServer().handler;
