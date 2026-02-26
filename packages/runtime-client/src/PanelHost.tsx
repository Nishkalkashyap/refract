import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type {
  RefractPanelProps,
  RefractSelectionRef,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";
import type { PanelSession } from "./panel-session";

interface PanelHostProps {
  session: PanelSession;
  shadowRoot: ShadowRoot;
  portalContainer: HTMLElement;
  onClose: () => void;
  invokeServer: (
    pluginId: string,
    selectionRef: RefractSelectionRef,
    payload: unknown
  ) => Promise<RefractServerResult>;
}

const PANEL_ANCHOR_GAP = 8;
const PANEL_VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function PanelHost({
  session,
  shadowRoot,
  portalContainer,
  onClose,
  invokeServer
}: PanelHostProps) {
  const [anchoredPosition, setAnchoredPosition] = useState<{ left: number; top: number } | null>(
    null
  );
  const panelHostRef = useRef<HTMLDivElement | null>(null);
  const anchorPoint = session.anchorPoint;

  const updateAnchoredPosition = useCallback(() => {
    const panelHost = panelHostRef.current;
    if (!panelHost) {
      return;
    }

    const rect = panelHost.getBoundingClientRect();
    const maxLeft = Math.max(
      PANEL_VIEWPORT_MARGIN,
      window.innerWidth - rect.width - PANEL_VIEWPORT_MARGIN
    );

    const left = clamp(anchorPoint.x, PANEL_VIEWPORT_MARGIN, maxLeft);
    const belowTop = anchorPoint.y + PANEL_ANCHOR_GAP;
    const aboveTop = anchorPoint.y - PANEL_ANCHOR_GAP - rect.height;

    let top = belowTop;
    if (
      belowTop + rect.height + PANEL_VIEWPORT_MARGIN > window.innerHeight &&
      aboveTop >= PANEL_VIEWPORT_MARGIN
    ) {
      top = aboveTop;
    }

    const maxTop = Math.max(
      PANEL_VIEWPORT_MARGIN,
      window.innerHeight - rect.height - PANEL_VIEWPORT_MARGIN
    );

    setAnchoredPosition({
      left,
      top: clamp(top, PANEL_VIEWPORT_MARGIN, maxTop)
    });
  }, [anchorPoint]);

  useLayoutEffect(() => {
    updateAnchoredPosition();
  }, [
    anchorPoint,
    session.selectionRef.column,
    session.selectionRef.file,
    session.selectionRef.line,
    updateAnchoredPosition
  ]);

  useEffect(() => {
    const onResize = () => {
      updateAnchoredPosition();
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [anchorPoint, updateAnchoredPosition]);

  const Panel = session.plugin.Panel as ((props: RefractPanelProps) => ReactNode) | undefined;
  if (!Panel) {
    return null;
  }

  const anchoredStyle = {
    left: `${Math.round(anchoredPosition?.left ?? anchorPoint.x)}px`,
    top: `${Math.round(anchoredPosition?.top ?? anchorPoint.y + PANEL_ANCHOR_GAP)}px`
  };

  return (
    <div
      ref={panelHostRef}
      className="panel-host"
      data-mode="anchored"
      style={anchoredStyle}
    >
      <div className="panel-shell">
        <div className="panel-head">
          <div className="panel-title">
            {session.plugin.label} · {session.selectionRef.file}:{session.selectionRef.line}
          </div>
          <button type="button" className="panel-close" onClick={onClose}>
            Close
          </button>
        </div>
        <Panel
          key={`${session.selectionRef.file}:${session.selectionRef.line}:${session.selectionRef.column ?? 0}`}
          selectionRef={session.selectionRef}
          element={session.element}
          closePanel={onClose}
          portalContainer={portalContainer}
          shadowRoot={shadowRoot}
          server={{
            invoke: (payload) => invokeServer(session.plugin.id, session.selectionRef, payload)
          }}
        />
      </div>
    </div>
  );
}
