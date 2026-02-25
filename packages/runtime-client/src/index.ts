import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { RefractRuntimeInitOptions } from "@refract/tool-contracts";

import { runtimeStyles } from "./runtime-styles";
import { ToolRuntimeApp } from "./ToolRuntimeApp";

const HOST_ID = "__refract_tool_runtime_host";
const RUNTIME_KEY = "__REFRACT_TOOL_RUNTIME__";

declare global {
  interface Window {
    [RUNTIME_KEY]?: RefractRuntimeBridge;
  }
}

class RefractRuntimeBridge {
  private readonly host: HTMLDivElement;
  private readonly root: Root;
  private options: RefractRuntimeInitOptions;

  constructor(options: RefractRuntimeInitOptions) {
    this.options = options;

    this.host = document.createElement("div");
    this.host.id = HOST_ID;

    const shadowRoot = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = runtimeStyles;

    const mountPoint = document.createElement("div");
    shadowRoot.append(style, mountPoint);

    this.root = createRoot(mountPoint);
  }

  mount(): void {
    const existingHost = document.getElementById(HOST_ID);
    if (existingHost) {
      existingHost.remove();
    }

    document.body.appendChild(this.host);
    this.render();
  }

  updateOptions(options: RefractRuntimeInitOptions): void {
    this.options = options;
    this.render();
  }

  private render(): void {
    this.root.render(
      createElement(ToolRuntimeApp, {
        hostElement: this.host,
        options: this.options
      })
    );
  }
}

export function initToolRuntime(options: RefractRuntimeInitOptions): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const existingRuntime = window[RUNTIME_KEY];
  if (existingRuntime) {
    existingRuntime.updateOptions(options);
    return;
  }

  const runtime = new RefractRuntimeBridge(options);
  runtime.mount();
  window[RUNTIME_KEY] = runtime;
}
