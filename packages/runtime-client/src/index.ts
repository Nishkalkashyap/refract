import type { ToolAction, ToolActionContext, ToolRuntimeInitOptions } from "./types";

const HOST_ID = "__refract_tool_runtime_host";
const RUNTIME_KEY = "__REFRACT_TOOL_RUNTIME__";
const DATA_FILE_ATTR = "data-tool-file";
const DATA_LINE_ATTR = "data-tool-line";
const DATA_COLUMN_ATTR = "data-tool-column";

const STYLE_TEXT = `
:host {
  all: initial;
}
.runtime-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483647;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}
.fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
}
.fab[data-active="true"] {
  background: #1d4ed8;
}
.overlay {
  position: fixed;
  border: 2px solid #1d4ed8;
  background: rgba(29, 78, 216, 0.12);
  pointer-events: none;
  display: none;
}
.label {
  position: fixed;
  pointer-events: none;
  display: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}
`;

declare global {
  interface Window {
    [RUNTIME_KEY]?: ToolRuntime;
  }
}

class ToolRuntime {
  private options: ToolRuntimeInitOptions;
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private root: HTMLDivElement;
  private fab: HTMLButtonElement;
  private overlay: HTMLDivElement;
  private label: HTMLDivElement;
  private selectMode = false;
  private hoveredElement: HTMLElement | null = null;

  constructor(options: ToolRuntimeInitOptions) {
    this.options = options;

    this.host = document.createElement("div");
    this.host.id = HOST_ID;

    this.shadow = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    this.root = document.createElement("div");
    this.root.className = "runtime-root";

    this.fab = document.createElement("button");
    this.fab.className = "fab";
    this.fab.type = "button";
    this.fab.textContent = "Select";

    this.overlay = document.createElement("div");
    this.overlay.className = "overlay";

    this.label = document.createElement("div");
    this.label.className = "label";

    this.root.append(this.fab, this.overlay, this.label);
    this.shadow.append(style, this.root);

    this.fab.addEventListener("click", this.handleFabClick);
    window.addEventListener("scroll", this.updateOverlayPosition, true);
    window.addEventListener("resize", this.updateOverlayPosition);
  }

  mount(): void {
    const existingHost = document.getElementById(HOST_ID);
    if (existingHost) {
      existingHost.remove();
    }

    document.body.appendChild(this.host);
  }

  updateOptions(options: ToolRuntimeInitOptions): void {
    this.options = options;
  }

  private handleFabClick = (): void => {
    this.setSelectMode(!this.selectMode);
  };

  private setSelectMode(active: boolean): void {
    this.selectMode = active;
    this.fab.dataset.active = active ? "true" : "false";

    if (active) {
      window.addEventListener("mousemove", this.handleMouseMove, true);
      window.addEventListener("click", this.handleClick, true);
      window.addEventListener("keydown", this.handleKeyDown, true);
      return;
    }

    window.removeEventListener("mousemove", this.handleMouseMove, true);
    window.removeEventListener("click", this.handleClick, true);
    window.removeEventListener("keydown", this.handleKeyDown, true);

    this.hoveredElement = null;
    this.hideOverlay();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.selectMode) {
      this.setSelectMode(false);
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.selectMode) {
      return;
    }

    const nextElement = this.findInstrumentedElement(event.target);
    if (nextElement === this.hoveredElement) {
      return;
    }

    this.hoveredElement = nextElement;
    this.updateOverlayPosition();
  };

  private handleClick = (event: MouseEvent): void => {
    if (!this.selectMode) {
      return;
    }

    const element = this.findInstrumentedElement(event.target);
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const file = element.getAttribute(DATA_FILE_ATTR);
    const line = Number.parseInt(element.getAttribute(DATA_LINE_ATTR) ?? "", 10);
    const column = Number.parseInt(element.getAttribute(DATA_COLUMN_ATTR) ?? "", 10);

    if (!file || Number.isNaN(line)) {
      return;
    }

    const action = this.getDefaultAction();
    if (!action) {
      return;
    }

    const context: ToolActionContext = {
      file,
      line,
      element,
      ...(Number.isNaN(column) ? {} : { column })
    };

    action.run(context);
  };

  private findInstrumentedElement(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    if (this.host.contains(target)) {
      return null;
    }

    return target.closest(`[${DATA_FILE_ATTR}]`) as HTMLElement | null;
  }

  private getDefaultAction(): ToolAction | undefined {
    if (this.options.defaultActionId) {
      return this.options.actions.find((action) => action.id === this.options.defaultActionId);
    }

    return this.options.actions[0];
  }

  private updateOverlayPosition = (): void => {
    if (!this.selectMode || !this.hoveredElement) {
      this.hideOverlay();
      return;
    }

    const rect = this.hoveredElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.hideOverlay();
      return;
    }

    this.overlay.style.display = "block";
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    const file = this.hoveredElement.getAttribute(DATA_FILE_ATTR) ?? "unknown";
    const line = this.hoveredElement.getAttribute(DATA_LINE_ATTR) ?? "?";
    this.label.style.display = "block";
    this.label.textContent = `${file}:${line}`;

    const labelTop = rect.top > 30 ? rect.top - 28 : rect.bottom + 8;
    this.label.style.left = `${Math.max(8, rect.left)}px`;
    this.label.style.top = `${Math.max(8, labelTop)}px`;
  };

  private hideOverlay(): void {
    this.overlay.style.display = "none";
    this.label.style.display = "none";
  }
}

export function initToolRuntime(options: ToolRuntimeInitOptions): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const existingRuntime = window[RUNTIME_KEY];
  if (existingRuntime) {
    existingRuntime.updateOptions(options);
    return;
  }

  const runtime = new ToolRuntime(options);
  runtime.mount();
  window[RUNTIME_KEY] = runtime;
}

export type { ToolAction, ToolActionContext, ToolRuntimeInitOptions } from "./types";
