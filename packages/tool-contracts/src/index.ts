export interface ToolSelectionRef {
  file: string;
  line: number;
  column?: number;
  tagName: string;
}

export interface ToolActionOperationRequest {
  actionId: string;
  operation: string;
  selection: ToolSelectionRef;
  input: unknown;
}

export interface ToolActionOperationSuccess {
  ok: true;
  data?: unknown;
}

export interface ToolActionOperationFailure {
  ok: false;
  code: string;
  message: string;
  status?: 400 | 403 | 404 | 409 | 500;
}

export type ToolActionOperationResult =
  | ToolActionOperationSuccess
  | ToolActionOperationFailure;

export interface ToolRuntimeOperationInvoker {
  (operation: string, input: unknown): Promise<ToolActionOperationResult>;
}

export interface ToolRuntimeActionContext {
  selection: ToolSelectionRef;
  element: HTMLElement;
  invokeOperation: ToolRuntimeOperationInvoker;
}

export interface ToolRuntimePanelProps {
  selection: ToolSelectionRef;
  element: HTMLElement;
  invokeOperation: ToolRuntimeOperationInvoker;
  closePanel: () => void;
  preview: {
    setClassName: (next: string) => void;
  };
}

export interface ToolRuntimeActionBase {
  id: string;
  label: string;
}

export interface ToolRuntimeCommandAction extends ToolRuntimeActionBase {
  type: "command";
  run(context: ToolRuntimeActionContext): void | Promise<void>;
}

export interface ToolRuntimePanelAction extends ToolRuntimeActionBase {
  type: "panel";
  Panel: (props: ToolRuntimePanelProps) => unknown;
}

export type ToolRuntimeAction = ToolRuntimeCommandAction | ToolRuntimePanelAction;

export interface ToolRuntimeInitOptions {
  actions: ToolRuntimeAction[];
  defaultActionId?: string;
}

export interface ToolServerOperationContext {
  actionId: string;
  operation: string;
  selection: ToolSelectionRef;
  input: unknown;
  projectRoot: string;
  absoluteFilePath: string;
}

export interface ToolServerOperationHandler {
  (context: ToolServerOperationContext):
    | ToolActionOperationResult
    | Promise<ToolActionOperationResult>;
}

export interface ToolActionRegistration {
  id: string;
  runtimeImport: {
    module: string;
    exportName: string;
  };
  serverOperations?: Record<string, ToolServerOperationHandler>;
}
