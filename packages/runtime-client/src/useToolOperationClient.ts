import { useCallback } from "react";

import type {
  RefractSelectionRef,
  RefractServerInvokeRequest,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";

const PLUGIN_ENDPOINT = "/@refract/plugin";

export function useToolOperationClient() {
  return useCallback(
    async (
      pluginId: string,
      selectionRef: RefractSelectionRef,
      payload: unknown
    ): Promise<RefractServerResult> => {
      const requestBody: RefractServerInvokeRequest = {
        pluginId,
        selectionRef,
        payload
      };

      try {
        const response = await fetch(PLUGIN_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        const json = await readJson(response);
        if (json && typeof json === "object" && "ok" in json) {
          const result = json as RefractServerResult;
          if (result.ok) {
            return result;
          }

          return {
            ok: false,
            code: result.code || "OPERATION_FAILED",
            message: result.message || "Plugin server handler failed.",
            status: result.status
          };
        }

        return {
          ok: false,
          code: "INVALID_RESPONSE",
          message: "Invalid plugin response from dev server."
        };
      } catch {
        return {
          ok: false,
          code: "NETWORK_ERROR",
          message: "Unable to reach dev server for plugin invocation."
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
