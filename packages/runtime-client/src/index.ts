import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TailwindEditorToolbarAdapter } from "./tailwind-toolbar-adapter";
import type { ToolAction, ToolActionContext, ToolRuntimeInitOptions } from "./types";

const HOST_ID = "__refract_tool_runtime_host";
const RUNTIME_KEY = "__REFRACT_TOOL_RUNTIME__";
const DATA_FILE_ATTR = "data-tool-file";
const DATA_LINE_ATTR = "data-tool-line";
const DATA_COLUMN_ATTR = "data-tool-column";
const TAILWIND_EDITOR_ACTION_ID = "tailwind-editor";
const UPDATE_CLASSNAME_PATH = "/@tool/update-classname";
const SAVE_DEBOUNCE_MS = 250;

const STYLE_TEXT = `
:host {
  all: initial;
}
.runtime-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483647;
  font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
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
.action-menu {
  position: fixed;
  min-width: 220px;
  max-width: 320px;
  display: none;
  pointer-events: auto;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}
.action-menu-header {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-menu-list {
  padding: 6px;
  display: grid;
  gap: 4px;
}
.action-item {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 10px;
  cursor: pointer;
}
.action-item:hover {
  background: #eff6ff;
}
.action-empty {
  padding: 8px 10px;
  font-size: 12px;
  color: #64748b;
}
.toolbar-host {
  position: fixed;
  left: 16px;
  right: 16px;
  top: 16px;
  pointer-events: auto;
  display: none;
}
.toolbar-shell {
  border: 1px solid #d1d5db;
  border-radius: 14px;
  background: #f8fafc;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  padding: 10px;
}
.toolbar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.toolbar-title {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toolbar-close {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}
.toolbar-close:hover {
  background: #f1f5f9;
}
.toolbar-status {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}
.toolbar-status[data-state="error"] {
  color: #b91c1c;
}
.tailwind-toolbar-adapter {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}
.tailwind-toolbar-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}
.tailwind-toolbar-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
}
.tailwind-toolbar-input:focus {
  outline: 2px solid #bfdbfe;
  outline-offset: 0;
  border-color: #3b82f6;
}
`;

type ToolbarSaveState = "idle" | "saving" | "error";

type ClassNameUpdateResponse = {
  ok: boolean;
  code?: string;
  message?: string;
};

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
  private actionMenu: HTMLDivElement;
  private actionMenuHeader: HTMLDivElement;
  private actionMenuList: HTMLDivElement;
  private toolbarHost: HTMLDivElement;
  private toolbarRoot: Root;
  private selectMode = false;
  private hoveredElement: HTMLElement | null = null;
  private toolbarSession: ToolActionContext | null = null;
  private toolbarValue = "";
  private toolbarSaveState: ToolbarSaveState = "idle";
  private toolbarErrorMessage = "";
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPersistValue: string | null = null;
  private persistRequestVersion = 0;
  private isClosingToolbar = false;

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

    this.actionMenu = document.createElement("div");
    this.actionMenu.className = "action-menu";

    this.actionMenuHeader = document.createElement("div");
    this.actionMenuHeader.className = "action-menu-header";

    this.actionMenuList = document.createElement("div");
    this.actionMenuList.className = "action-menu-list";

    this.toolbarHost = document.createElement("div");
    this.toolbarHost.className = "toolbar-host";
    this.toolbarRoot = createRoot(this.toolbarHost);

    this.actionMenu.append(this.actionMenuHeader, this.actionMenuList);
    this.root.append(this.fab, this.overlay, this.label, this.actionMenu, this.toolbarHost);
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
    this.renderToolbar();
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
      window.addEventListener("contextmenu", this.handleContextMenu, true);
      window.addEventListener("keydown", this.handleKeyDown, true);
      return;
    }

    window.removeEventListener("mousemove", this.handleMouseMove, true);
    window.removeEventListener("click", this.handleClick, true);
    window.removeEventListener("contextmenu", this.handleContextMenu, true);
    window.removeEventListener("keydown", this.handleKeyDown, true);

    this.hoveredElement = null;
    this.hideOverlay();
    this.hideActionMenu();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }

    if (this.selectMode) {
      this.setSelectMode(false);
      return;
    }

    if (this.toolbarSession) {
      event.preventDefault();
      void this.closeToolbarWithFlush();
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

    if (this.isActionMenuVisible()) {
      if (event.target instanceof Node && this.actionMenu.contains(event.target)) {
        return;
      }

      this.hideActionMenu();
    }

    const element = this.findInstrumentedElement(event.target);
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const action = this.getDefaultAction();
    if (!action) {
      return;
    }

    const context = this.createActionContext(element);
    if (!context) {
      return;
    }

    this.invokeAction(action, context);
  };

  private handleContextMenu = (event: MouseEvent): void => {
    if (!this.selectMode) {
      return;
    }

    const element = this.findInstrumentedElement(event.target);
    if (!element) {
      this.hideActionMenu();
      return;
    }

    const context = this.createActionContext(element);
    if (!context) {
      this.hideActionMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.hoveredElement = element;
    this.updateOverlayPosition();
    this.showActionMenu(event.clientX, event.clientY, context);
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

  private createActionContext(element: HTMLElement): ToolActionContext | null {
    const file = element.getAttribute(DATA_FILE_ATTR);
    const line = Number.parseInt(element.getAttribute(DATA_LINE_ATTR) ?? "", 10);
    const column = Number.parseInt(element.getAttribute(DATA_COLUMN_ATTR) ?? "", 10);

    if (!file || Number.isNaN(line)) {
      return null;
    }

    return {
      file,
      line,
      element,
      ...(Number.isNaN(column) ? {} : { column })
    };
  }

  private invokeAction(action: ToolAction, context: ToolActionContext): void {
    if (action.id === TAILWIND_EDITOR_ACTION_ID) {
      this.openTailwindEditor(context);
      this.setSelectMode(false);
      return;
    }

    try {
      action.run(context);
    } finally {
      this.setSelectMode(false);
    }
  }

  private openTailwindEditor(context: ToolActionContext): void {
    this.toolbarSession = context;
    this.toolbarValue = context.element.className ?? "";
    this.toolbarSaveState = "idle";
    this.toolbarErrorMessage = "";
    this.pendingPersistValue = null;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    this.renderToolbar();
  }

  private handleToolbarValueChange = (next: string): void => {
    if (!this.toolbarSession) {
      return;
    }

    this.toolbarValue = next;
    this.toolbarSession.element.className = next;
    this.toolbarSaveState = "saving";
    this.toolbarErrorMessage = "";
    this.schedulePersist(next);
    this.renderToolbar();
  };

  private schedulePersist(next: string): void {
    this.pendingPersistValue = next;

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      const pendingValue = this.pendingPersistValue;
      this.pendingPersistValue = null;
      if (pendingValue !== null) {
        void this.persistClassName(pendingValue);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  private async persistClassName(next: string): Promise<void> {
    if (!this.toolbarSession) {
      return;
    }

    const requestVersion = ++this.persistRequestVersion;
    this.toolbarSaveState = "saving";
    this.toolbarErrorMessage = "";
    this.renderToolbar();

    try {
      const response = await fetch(UPDATE_CLASSNAME_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: this.toolbarSession.file,
          line: this.toolbarSession.line,
          ...(typeof this.toolbarSession.column === "number"
            ? { column: this.toolbarSession.column }
            : {}),
          nextClassName: next
        })
      });

      const result = (await readJsonResponse(response)) as ClassNameUpdateResponse | null;
      if (requestVersion !== this.persistRequestVersion) {
        return;
      }

      if (response.ok && result?.ok) {
        this.toolbarSaveState = "idle";
        this.toolbarErrorMessage = "";
        this.renderToolbar();
        return;
      }

      this.toolbarSaveState = "error";
      this.toolbarErrorMessage = result?.message ?? "Failed to persist className changes.";
      this.renderToolbar();
    } catch {
      if (requestVersion !== this.persistRequestVersion) {
        return;
      }

      this.toolbarSaveState = "error";
      this.toolbarErrorMessage = "Unable to reach dev server for className updates.";
      this.renderToolbar();
    }
  }

  private handleToolbarCloseClick = (): void => {
    void this.closeToolbarWithFlush();
  };

  private async closeToolbarWithFlush(): Promise<void> {
    if (!this.toolbarSession || this.isClosingToolbar) {
      return;
    }

    this.isClosingToolbar = true;
    try {
      await this.flushPendingPersist();
    } finally {
      this.isClosingToolbar = false;
      this.teardownToolbar();
    }
  }

  private async flushPendingPersist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    const pendingValue = this.pendingPersistValue;
    this.pendingPersistValue = null;

    if (pendingValue === null) {
      return;
    }

    await this.persistClassName(pendingValue);
  }

  private teardownToolbar(): void {
    this.persistRequestVersion += 1;
    this.toolbarSession = null;
    this.toolbarValue = "";
    this.toolbarSaveState = "idle";
    this.toolbarErrorMessage = "";
    this.toolbarHost.style.display = "none";
    this.toolbarRoot.render(null);
  }

  private renderToolbar(): void {
    if (!this.toolbarSession) {
      this.toolbarHost.style.display = "none";
      this.toolbarRoot.render(null);
      return;
    }

    this.toolbarHost.style.display = "block";

    let statusText = "Ready";
    if (this.toolbarSaveState === "saving") {
      statusText = "Saving...";
    } else if (this.toolbarSaveState === "error") {
      statusText = this.toolbarErrorMessage || "Failed to persist className changes.";
    }

    this.toolbarRoot.render(
      createElement(
        "div",
        { className: "toolbar-shell" },
        createElement(
          "div",
          { className: "toolbar-head" },
          createElement(
            "div",
            { className: "toolbar-title" },
            `${this.toolbarSession.file}:${this.toolbarSession.line}`
          ),
          createElement(
            "button",
            {
              type: "button",
              className: "toolbar-close",
              onClick: this.handleToolbarCloseClick
            },
            "Close"
          )
        ),
        createElement(TailwindEditorToolbarAdapter, {
          value: this.toolbarValue,
          onChange: this.handleToolbarValueChange
        }),
        createElement(
          "div",
          {
            className: "toolbar-status",
            "data-state": this.toolbarSaveState
          },
          statusText
        )
      )
    );
  }

  private showActionMenu(clientX: number, clientY: number, context: ToolActionContext): void {
    this.actionMenuHeader.textContent = `${context.file}:${context.line}`;
    this.actionMenuList.innerHTML = "";

    if (this.options.actions.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "action-empty";
      emptyState.textContent = "No actions available";
      this.actionMenuList.append(emptyState);
    } else {
      for (const action of this.options.actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "action-item";
        button.textContent = action.label;
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.invokeAction(action, context);
        });
        this.actionMenuList.append(button);
      }
    }

    this.actionMenu.style.display = "block";
    this.actionMenu.style.left = "0px";
    this.actionMenu.style.top = "0px";

    const rect = this.actionMenu.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const left = Math.min(clientX, maxLeft);
    const top = Math.min(clientY, maxTop);

    this.actionMenu.style.left = `${left}px`;
    this.actionMenu.style.top = `${top}px`;
  }

  private hideActionMenu(): void {
    this.actionMenu.style.display = "none";
  }

  private isActionMenuVisible(): boolean {
    return this.actionMenu.style.display === "block";
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

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
