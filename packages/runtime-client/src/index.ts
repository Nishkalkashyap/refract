import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { RefractRuntimeInitOptions, RefractSelectionRef, RefractServerResult } from "@nkstack/refract-tool-contracts";

import { PanelHost } from "./PanelHost";
import { PANEL_CLOSE_REQUEST_EVENT } from "./panel-events";
import type { PanelSession } from "./panel-session";
import { markRuntimeOwned } from "./runtime-dom";
import { panelSurfaceStyles, runtimeShellStyles } from "./runtime-styles";
import { ToolRuntimeApp } from "./ToolRuntimeApp";
import { DEFAULT_PLUGIN_ENDPOINT, invokeToolOperation } from "./useToolOperationClient";

const HOST_ID = "__refract_tool_runtime_host";
const PANEL_HOST_ID = "__refract_tool_runtime_panel_host";
const RUNTIME_KEY = "__REFRACT_TOOL_RUNTIME__";

declare global {
  interface Window {
    [RUNTIME_KEY]?: RefractRuntimeBridge;
  }
}

interface PanelSurface {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  portalContainer: HTMLDivElement;
  root: Root;
}

class RefractRuntimeBridge {
  private readonly shellHost: HTMLDivElement;
  private readonly shellShadowRoot: ShadowRoot;
  private readonly shellRoot: Root;
  private options: RefractRuntimeInitOptions;
  private panelSurface: PanelSurface | null = null;

  constructor(options: RefractRuntimeInitOptions) {
    this.options = options;

    this.shellHost = document.createElement("div");
    this.shellHost.id = HOST_ID;
    markRuntimeOwned(this.shellHost);

    this.shellShadowRoot = this.shellHost.attachShadow({ mode: "open" });
    const style = this.createStyleElement(runtimeShellStyles);
    const mountPoint = document.createElement("div");

    this.shellShadowRoot.append(style, mountPoint);
    this.shellRoot = createRoot(mountPoint);
  }

  mount(): void {
    document.getElementById(HOST_ID)?.remove();
    document.getElementById(PANEL_HOST_ID)?.remove();

    document.body.appendChild(this.shellHost);
    this.render();
  }

  updateOptions(options: RefractRuntimeInitOptions): void {
    this.options = options;
    this.render();
  }

  private render(): void {
    this.shellRoot.render(
      createElement(ToolRuntimeApp, {
        options: this.options,
        onPanelSessionChange: (session: PanelSession | null) => {
          this.syncPanelSurface(session);
        }
      })
    );
  }

  private syncPanelSurface(session: PanelSession | null): void {
    if (!session || !session.plugin.Panel) {
      this.disposePanelSurface();
      return;
    }

    this.disposePanelSurface();
    this.panelSurface = this.createPanelSurface(session);
    document.body.appendChild(this.panelSurface.host);

    this.panelSurface.root.render(
      createElement(PanelHost, {
        session,
        shadowRoot: this.panelSurface.shadowRoot,
        portalContainer: this.panelSurface.portalContainer,
        onClose: () => window.dispatchEvent(new Event(PANEL_CLOSE_REQUEST_EVENT)),
        invokeServer: (
          pluginId: string,
          selectionRef: RefractSelectionRef,
          payload: unknown
        ): Promise<RefractServerResult> => {
          return invokeToolOperation(
            this.options.serverEndpoint ?? DEFAULT_PLUGIN_ENDPOINT,
            pluginId,
            selectionRef,
            payload
          );
        }
      })
    );
  }

  private createPanelSurface(session: PanelSession): PanelSurface {
    const host = document.createElement("div");
    host.id = PANEL_HOST_ID;
    markRuntimeOwned(host);

    const shadowRoot = host.attachShadow({ mode: "open" });
    const baseStyleTag = this.createStyleElement(panelSurfaceStyles);
    const pluginStyles = session.plugin.panelStyles ?? [];
    const pluginStyleTags = pluginStyles.map((styleText) => this.createStyleElement(styleText));

    const mountPoint = document.createElement("div");
    const portalContainer = document.createElement("div");
    portalContainer.setAttribute("data-refract-plugin-portal-root", "true");

    shadowRoot.append(baseStyleTag, ...pluginStyleTags, mountPoint, portalContainer);

    return {
      host,
      shadowRoot,
      portalContainer,
      root: createRoot(mountPoint)
    };
  }

  private createStyleElement(styleText: string): HTMLStyleElement {
    const style = document.createElement("style");
    style.textContent = styleText;
    return style;
  }

  private disposePanelSurface(): void {
    if (!this.panelSurface) {
      return;
    }

    this.panelSurface.root.unmount();
    this.panelSurface.host.remove();
    this.panelSurface = null;
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

export { RefractBootstrap } from "./RefractBootstrap";
export type { RefractBootstrapProps } from "./RefractBootstrap";
