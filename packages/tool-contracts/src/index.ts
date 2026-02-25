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

interface ToolActionOperationSuccess {
  ok: true;
  data?: unknown;
}

interface ToolActionOperationFailure {
  ok: false;
  code: string;
  message: string;
  status?: 400 | 403 | 404 | 409 | 500;
}

export type ToolActionOperationResult =
  | ToolActionOperationSuccess
  | ToolActionOperationFailure;

interface ToolRuntimeOperationInvoker {
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

interface ToolRuntimeActionBase {
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

export interface ToolRuntimeManifestAction {
  id: string;
  runtimeModule: string;
  runtimeExport: string;
}

export interface ToolRuntimeBootstrapPayload {
  actions: ToolRuntimeManifestAction[];
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
  runtimeModule: string;
  runtimeExport: string;
  serverOperations?: Record<string, ToolServerOperationHandler>;
}
