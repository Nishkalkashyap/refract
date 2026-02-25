import { useEffect, useMemo, useState } from "react";

import type { RefractRuntimeInitOptions, RefractRuntimePlugin } from "@nkstack/refract-tool-contracts";

import { ActionMenu, type ActionMenuState } from "./ActionMenu";
import { PanelHost } from "./PanelHost";
import { RuntimeFab } from "./RuntimeFab";
import type { RuntimeSelectionTarget } from "./runtime-dom";
import { SelectionOverlay } from "./SelectionOverlay";
import { useActionExecutor } from "./useActionExecutor";
import { useSelectionMode } from "./useSelectionMode";
import { useToolOperationClient } from "./useToolOperationClient";

interface ToolRuntimeAppProps {
  hostElement: HTMLElement;
  options: RefractRuntimeInitOptions;
}

interface PanelSession {
  plugin: RefractRuntimePlugin;
  selectionRef: RuntimeSelectionTarget["selectionRef"];
  element: HTMLElement;
}

export function ToolRuntimeApp({ hostElement, options }: ToolRuntimeAppProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [panelSession, setPanelSession] = useState<PanelSession | null>(null);

  const invokeServer = useToolOperationClient(options.serverEndpoint);

  const defaultPlugin = useMemo(() => {
    if (options.defaultPluginId) {
      return options.plugins.find((candidate) => candidate.id === options.defaultPluginId);
    }

    return options.plugins[0];
  }, [options.plugins, options.defaultPluginId]);

  const executePlugin = useActionExecutor({
    invokeServer,
    openPanel: (session) => setPanelSession(session),
    closePanel: () => setPanelSession(null),
    closeSelectMode: () => setSelectMode(false),
    clearContextMenu: () => setActionMenu(null)
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panelSession && !selectMode) {
        event.preventDefault();
        setPanelSession(null);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [panelSession, selectMode]);

  const hoveredTarget = useSelectionMode({
    enabled: selectMode,
    hostElement,
    onPrimarySelect: (target) => {
      if (!defaultPlugin) {
        return;
      }

      executePlugin(defaultPlugin, target);
    },
    onContextSelect: (target, position) => {
      setActionMenu({
        x: position.x,
        y: position.y,
        target
      });
    },
    onClearIntent: () => {
      setActionMenu(null);
    },
    onEscape: () => {
      setActionMenu(null);
      setSelectMode(false);
    }
  });

  return (
    <div className="runtime-root">
      <RuntimeFab active={selectMode} onToggle={() => setSelectMode((current) => !current)} />

      <SelectionOverlay enabled={selectMode} hoveredTarget={hoveredTarget} />

      {actionMenu ? (
        <ActionMenu
          state={actionMenu}
          plugins={options.plugins}
          onSelect={(pluginId) => {
            const plugin = options.plugins.find((candidate) => candidate.id === pluginId);
            if (!plugin) {
              return;
            }

            executePlugin(plugin, actionMenu.target);
          }}
        />
      ) : null}

      {panelSession ? (
        <PanelHost
          session={panelSession}
          onClose={() => {
            setPanelSession(null);
          }}
          invokeServer={invokeServer}
        />
      ) : null}
    </div>
  );
}
