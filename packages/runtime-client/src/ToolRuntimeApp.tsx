import { useEffect, useMemo, useState } from "react";

import type { ToolRuntimeAction, ToolRuntimeInitOptions } from "@refract/tool-contracts";

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
  options: ToolRuntimeInitOptions;
}

interface PanelSession {
  action: Extract<ToolRuntimeAction, { type: "panel" }>;
  selection: RuntimeSelectionTarget["selection"];
  element: HTMLElement;
}

export function ToolRuntimeApp({ hostElement, options }: ToolRuntimeAppProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [panelSession, setPanelSession] = useState<PanelSession | null>(null);

  const invokeOperation = useToolOperationClient();

  const defaultAction = useMemo(() => {
    if (options.defaultActionId) {
      return options.actions.find((candidate) => candidate.id === options.defaultActionId);
    }

    return options.actions[0];
  }, [options.actions, options.defaultActionId]);

  const executeAction = useActionExecutor({
    invokeOperation,
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
      if (!defaultAction) {
        return;
      }

      executeAction(defaultAction, target);
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
          actions={options.actions}
          onSelect={(actionId) => {
            const action = options.actions.find((candidate) => candidate.id === actionId);
            if (!action) {
              return;
            }

            executeAction(action, actionMenu.target);
          }}
        />
      ) : null}

      {panelSession ? (
        <PanelHost
          session={panelSession}
          onClose={() => {
            setPanelSession(null);
          }}
          invokeOperation={invokeOperation}
        />
      ) : null}
    </div>
  );
}
