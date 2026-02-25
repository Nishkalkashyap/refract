export interface ToolActionContext {
  file: string;
  line: number;
  column?: number;
  element: HTMLElement;
}

export interface ToolAction {
  id: string;
  label: string;
  run(context: ToolActionContext): void;
}

export interface ToolRuntimeInitOptions {
  actions: ToolAction[];
  defaultActionId?: string;
}
