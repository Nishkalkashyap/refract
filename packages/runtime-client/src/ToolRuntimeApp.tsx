import { useEffect, useMemo, useState } from "react";

import type { RefractRuntimeInitOptions } from "@nkstack/refract-tool-contracts";

import { ActionMenu, type ActionMenuState } from "./ActionMenu";
import { PANEL_CLOSE_REQUEST_EVENT } from "./panel-events";
import type { PanelSession } from "./panel-session";
import { RuntimeFab } from "./RuntimeFab";
import { SelectionOverlay } from "./SelectionOverlay";
import { useActionExecutor } from "./useActionExecutor";
import { useSelectionMode } from "./useSelectionMode";
import { useToolOperationClient } from "./useToolOperationClient";

interface ToolRuntimeAppProps {
  options: RefractRuntimeInitOptions;
  onPanelSessionChange: (session: PanelSession | null) => void;
}

export function ToolRuntimeApp({ options, onPanelSessionChange }: ToolRuntimeAppProps) {
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

  useEffect(() => {
    const onPanelCloseRequested = () => {
      setPanelSession(null);
    };

    window.addEventListener(PANEL_CLOSE_REQUEST_EVENT, onPanelCloseRequested);
    return () => {
      window.removeEventListener(PANEL_CLOSE_REQUEST_EVENT, onPanelCloseRequested);
    };
  }, []);

  const hoveredTarget = useSelectionMode({
    enabled: selectMode,
    onPrimarySelect: (target, position) => {
      if (!defaultPlugin) {
        return;
      }

      executePlugin(defaultPlugin, target, position);
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

  useEffect(() => {
    onPanelSessionChange(panelSession);

    return () => {
      onPanelSessionChange(null);
    };
  }, [onPanelSessionChange, panelSession]);

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

            executePlugin(plugin, actionMenu.target, {
              x: actionMenu.x,
              y: actionMenu.y
            });
          }}
        />
      ) : null}
    </div>
  );
}
