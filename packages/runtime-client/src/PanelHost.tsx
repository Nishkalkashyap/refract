import type { ReactNode } from "react";

import type {
  ToolActionOperationResult,
  ToolRuntimePanelAction,
  ToolRuntimePanelProps,
  ToolSelectionRef
} from "@refract/tool-contracts";

interface PanelSession {
  action: ToolRuntimePanelAction;
  selection: ToolSelectionRef;
  element: HTMLElement;
}

interface PanelHostProps {
  session: PanelSession;
  onClose: () => void;
  invokeOperation: (
    actionId: string,
    operation: string,
    selection: ToolSelectionRef,
    input: unknown
  ) => Promise<ToolActionOperationResult>;
}

export function PanelHost({ session, onClose, invokeOperation }: PanelHostProps) {
  const Panel = session.action.Panel as (props: ToolRuntimePanelProps) => ReactNode;

  return (
    <div className="panel-host">
      <div className="panel-shell">
        <div className="panel-head">
          <div className="panel-title">
            {session.action.label} · {session.selection.file}:{session.selection.line}
          </div>
          <button type="button" className="panel-close" onClick={onClose}>
            Close
          </button>
        </div>
        <Panel
          key={`${session.selection.file}:${session.selection.line}:${session.selection.column ?? 0}`}
          selection={session.selection}
          element={session.element}
          closePanel={onClose}
          invokeOperation={(operation, input) =>
            invokeOperation(session.action.id, operation, session.selection, input)
          }
          preview={{
            setClassName: (next) => {
              session.element.className = next;
            }
          }}
        />
      </div>
    </div>
  );
}
