import { useCallback } from "react";

import type {
  RefractRuntimePlugin,
  RefractSelectionRef,
  RefractServerResult
} from "@refract/tool-contracts";

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
      target: { selectionRef: RefractSelectionRef; element: HTMLElement }
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
                element: target.element
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
