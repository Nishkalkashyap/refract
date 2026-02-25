import { useCallback } from "react";

import type {
  RefractRuntimePlugin,
  RefractSelectionRef,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";

interface InteractionPoint {
  x: number;
  y: number;
}

interface UseActionExecutorOptions {
  invokeServer: (
    pluginId: string,
    selectionRef: RefractSelectionRef,
    payload: unknown
  ) => Promise<RefractServerResult>;
  openPanel: (session: {
    plugin: RefractRuntimePlugin;
    selectionRef: RefractSelectionRef;
    element: HTMLElement;
    anchorPoint: InteractionPoint;
  }) => void;
  closePanel: () => void;
  closeSelectMode: () => void;
  clearContextMenu: () => void;
}

export function useActionExecutor(options: UseActionExecutorOptions) {
  const { invokeServer, openPanel, closePanel, closeSelectMode, clearContextMenu } = options;

  return useCallback(
    (
      plugin: RefractRuntimePlugin,
      target: { selectionRef: RefractSelectionRef; element: HTMLElement },
      interactionPoint: InteractionPoint
    ) => {
      clearContextMenu();
      closeSelectMode();
      closePanel();

      Promise.resolve(
        plugin.inBrowserHandler({
          selectionRef: target.selectionRef,
          element: target.element,
          ui: {
            openPanel: () => {
              if (!plugin.Panel) {
                return;
              }

              openPanel({
                plugin,
                selectionRef: target.selectionRef,
                element: target.element,
                anchorPoint: interactionPoint
              });
            },
            closePanel
          },
          server: {
            invoke: (payload) => invokeServer(plugin.id, target.selectionRef, payload)
          }
        })
      ).catch(() => {
        // Intentionally swallow runtime plugin exceptions to keep refract responsive.
      });
    },
    [clearContextMenu, closePanel, closeSelectMode, invokeServer, openPanel]
  );
}
