import type {
  ToolRuntimeAction,
  ToolRuntimeBootstrapPayload,
  ToolRuntimeManifestAction
} from "@refract/tool-contracts";

import { initToolRuntime } from "./index";

export class RuntimeBootstrapper {
  async bootstrap(payload: ToolRuntimeBootstrapPayload): Promise<void> {
    const settledModules = await Promise.allSettled(
      payload.actions.map(async (action) => ({
        action,
        moduleNamespace: await import(/* @vite-ignore */ action.runtimeModule)
      }))
    );

    const runtimeActions: ToolRuntimeAction[] = [];

    for (const settled of settledModules) {
      if (settled.status === "rejected") {
        console.warn("[refract] Failed to load runtime action module.", settled.reason);
        continue;
      }

      const { action, moduleNamespace } = settled.value;
      const runtimeAction = this.resolveRuntimeAction(action, moduleNamespace);
      if (runtimeAction) {
        runtimeActions.push(runtimeAction);
      }
    }

    const defaultActionId = this.resolveDefaultActionId(
      payload.defaultActionId,
      runtimeActions
    );

    initToolRuntime({
      actions: runtimeActions,
      ...(defaultActionId ? { defaultActionId } : {})
    });
  }

  private resolveRuntimeAction(
    action: ToolRuntimeManifestAction,
    moduleNamespace: unknown
  ): ToolRuntimeAction | null {
    if (typeof moduleNamespace !== "object" || moduleNamespace === null) {
      console.warn(`[refract] Invalid runtime action module for '${action.id}'.`);
      return null;
    }

    const runtimeExport = (moduleNamespace as Record<string, unknown>)[
      action.runtimeExport
    ];

    if (!this.isToolRuntimeAction(runtimeExport)) {
      console.warn(
        `[refract] Runtime export '${action.runtimeExport}' is invalid for action '${action.id}'.`
      );
      return null;
    }

    return runtimeExport;
  }

  private isToolRuntimeAction(candidate: unknown): candidate is ToolRuntimeAction {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }

    const action = candidate as Record<string, unknown>;
    if (
      typeof action.id !== "string" ||
      typeof action.label !== "string" ||
      (action.type !== "command" && action.type !== "panel")
    ) {
      return false;
    }

    if (action.type === "command") {
      return typeof action.run === "function";
    }

    return typeof action.Panel === "function";
  }

  private resolveDefaultActionId(
    requestedDefaultActionId: string | undefined,
    actions: ToolRuntimeAction[]
  ): string | undefined {
    if (!requestedDefaultActionId) {
      return actions[0]?.id;
    }

    if (actions.some((action) => action.id === requestedDefaultActionId)) {
      return requestedDefaultActionId;
    }

    console.warn(
      `[refract] defaultActionId '${requestedDefaultActionId}' was not loaded. Falling back to the first available action.`
    );
    return actions[0]?.id;
  }
}

export async function bootstrapToolRuntime(
  payload: ToolRuntimeBootstrapPayload
): Promise<void> {
  return new RuntimeBootstrapper().bootstrap(payload);
}
