import { useEffect, useState } from "react";

import type { RuntimeSelectionTarget } from "./runtime-dom";
import { findInstrumentedElement, toSelectionTarget } from "./runtime-dom";

interface UseSelectionModeOptions {
  enabled: boolean;
  hostElement: HTMLElement;
  onPrimarySelect: (target: RuntimeSelectionTarget, position: { x: number; y: number }) => void;
  onContextSelect: (target: RuntimeSelectionTarget, position: { x: number; y: number }) => void;
  onClearIntent: () => void;
  onEscape: () => void;
}

export function useSelectionMode(options: UseSelectionModeOptions): RuntimeSelectionTarget | null {
  const {
    enabled,
    hostElement,
    onPrimarySelect,
    onContextSelect,
    onClearIntent,
    onEscape
  } = options;

  const [hoveredTarget, setHoveredTarget] = useState<RuntimeSelectionTarget | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHoveredTarget(null);
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      if (event.target instanceof Node && hostElement.contains(event.target)) {
        return;
      }

      const element = findInstrumentedElement(event.target, hostElement);
      if (!element) {
        setHoveredTarget(null);
        return;
      }

      setHoveredTarget(toSelectionTarget(element));
    };

    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && hostElement.contains(event.target)) {
        return;
      }

      const element = findInstrumentedElement(event.target, hostElement);
      if (!element) {
        onClearIntent();
        return;
      }

      const target = toSelectionTarget(element);
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onPrimarySelect(target, { x: event.clientX, y: event.clientY });
    };

    const onContextMenu = (event: MouseEvent) => {
      if (event.target instanceof Node && hostElement.contains(event.target)) {
        return;
      }

      const element = findInstrumentedElement(event.target, hostElement);
      if (!element) {
        onClearIntent();
        return;
      }

      const target = toSelectionTarget(element);
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onContextSelect(target, { x: event.clientX, y: event.clientY });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [enabled, hostElement, onClearIntent, onContextSelect, onEscape, onPrimarySelect]);

  return hoveredTarget;
}
