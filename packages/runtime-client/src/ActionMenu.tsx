import { useLayoutEffect, useRef, useState } from "react";

import type { ToolRuntimeAction } from "@refract/tool-contracts";

import type { RuntimeSelectionTarget } from "./runtime-dom";

export interface ActionMenuState {
  x: number;
  y: number;
  target: RuntimeSelectionTarget;
}

interface ActionMenuProps {
  state: ActionMenuState;
  actions: ToolRuntimeAction[];
  onSelect: (actionId: string) => void;
}

export function ActionMenu({ state, actions, onSelect }: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: state.x, top: state.y });

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);

    setPosition({
      left: Math.min(state.x, maxLeft),
      top: Math.min(state.y, maxTop)
    });
  }, [state.x, state.y, actions.length]);

  return (
    <div
      ref={menuRef}
      className="action-menu"
      style={{ left: position.left, top: position.top }}
    >
      <div className="action-menu-header">
        {state.target.selection.file}:{state.target.selection.line}
      </div>
      <div className="action-menu-list">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="action-menu-item"
            onClick={() => onSelect(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
