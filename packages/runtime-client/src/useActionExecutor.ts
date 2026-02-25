import { useCallback } from "react";

import type {
  ToolActionOperationResult,
  ToolRuntimeAction,
  ToolSelectionRef
} from "@refract/tool-contracts";

interface UseActionExecutorOptions {
  invokeOperation: (
    actionId: string,
    operation: string,
    selection: ToolSelectionRef,
    input: unknown
  ) => Promise<ToolActionOperationResult>;
  openPanel: (session: {
    action: Extract<ToolRuntimeAction, { type: "panel" }>;
    selection: ToolSelectionRef;
    element: HTMLElement;
  }) => void;
  closePanel: () => void;
  closeSelectMode: () => void;
  clearContextMenu: () => void;
}

export function useActionExecutor(options: UseActionExecutorOptions) {
  const {
    invokeOperation,
    openPanel,
    closePanel,
    closeSelectMode,
    clearContextMenu
  } = options;

  return useCallback(
    (action: ToolRuntimeAction, target: { selection: ToolSelectionRef; element: HTMLElement }) => {
      clearContextMenu();
      closeSelectMode();
      closePanel();

      if (action.type === "panel") {
        openPanel({
          action,
          selection: target.selection,
          element: target.element
        });
        return;
      }

      Promise.resolve(
        action.run({
          selection: target.selection,
          element: target.element,
          invokeOperation: (operation, input) =>
            invokeOperation(action.id, operation, target.selection, input)
        })
      ).catch(() => {
        // Intentionally swallow runtime action exceptions to keep tool responsive.
      });
    },
    [clearContextMenu, closePanel, closeSelectMode, invokeOperation, openPanel]
  );
}
