import { useCallback } from "react";

import type {
  ToolActionOperationResult,
  ToolSelectionRef
} from "@refract/tool-contracts";

const ACTION_ENDPOINT = "/@tool/action";

export function useToolOperationClient() {
  return useCallback(
    async (
      actionId: string,
      operation: string,
      selection: ToolSelectionRef,
      input: unknown
    ): Promise<ToolActionOperationResult> => {
      try {
        const response = await fetch(ACTION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            actionId,
            operation,
            selection,
            input
          })
        });

        const json = await readJson(response);
        if (json && typeof json === "object" && "ok" in json) {
          const result = json as ToolActionOperationResult;
          if (result.ok) {
            return result;
          }

          return {
            ok: false,
            code: result.code || "OPERATION_FAILED",
            message: result.message || "Action operation failed.",
            status: result.status
          };
        }

        return {
          ok: false,
          code: "INVALID_RESPONSE",
          message: "Invalid operation response from dev server."
        };
      } catch {
        return {
          ok: false,
          code: "NETWORK_ERROR",
          message: "Unable to reach dev server for action operation."
        };
      }
    },
    []
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
