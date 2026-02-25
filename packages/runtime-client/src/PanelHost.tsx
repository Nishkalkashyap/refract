import type { ReactNode } from "react";

import type {
  RefractPanelProps,
  RefractRuntimePlugin,
  RefractSelectionRef,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";

interface PanelSession {
  plugin: RefractRuntimePlugin;
  selectionRef: RefractSelectionRef;
  element: HTMLElement;
}

interface PanelHostProps {
  session: PanelSession;
  onClose: () => void;
  invokeServer: (
    pluginId: string,
    selectionRef: RefractSelectionRef,
    payload: unknown
  ) => Promise<RefractServerResult>;
}

export function PanelHost({ session, onClose, invokeServer }: PanelHostProps) {
  if (!session.plugin.Panel) {
    return null;
  }

  const Panel = session.plugin.Panel as (props: RefractPanelProps) => ReactNode;

  return (
    <div className="panel-host">
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
          server={{
            invoke: (payload) => invokeServer(session.plugin.id, session.selectionRef, payload)
          }}
        />
      </div>
    </div>
  );
}
