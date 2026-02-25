import { useEffect, useState } from "react";

import type { RuntimeSelectionTarget } from "./runtime-dom";

interface SelectionOverlayProps {
  enabled: boolean;
  hoveredTarget: RuntimeSelectionTarget | null;
}

export function SelectionOverlay({ enabled, hoveredTarget }: SelectionOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!enabled || !hoveredTarget) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const nextRect = hoveredTarget.element.getBoundingClientRect();
      if (nextRect.width <= 0 || nextRect.height <= 0) {
        setRect(null);
        return;
      }

      setRect(nextRect);
    };

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [enabled, hoveredTarget]);

  if (!enabled || !hoveredTarget || !rect) {
    return null;
  }

  const labelTop = rect.top > 30 ? rect.top - 28 : rect.bottom + 8;

  return (
    <>
      <div
        className="selection-overlay"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }}
      />
      <div
        className="selection-label"
        style={{
          left: Math.max(8, rect.left),
          top: Math.max(8, labelTop)
        }}
      >
        {hoveredTarget.selection.file}:{hoveredTarget.selection.line}
      </div>
    </>
  );
}
