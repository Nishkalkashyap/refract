import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { RefractRuntimeInitOptions } from "@nkstack/refract-tool-contracts";

import { runtimeDocumentStyles, runtimeStyles } from "./runtime-styles";
import { ToolRuntimeApp } from "./ToolRuntimeApp";

const HOST_ID = "__refract_tool_runtime_host";
const RUNTIME_KEY = "__REFRACT_TOOL_RUNTIME__";
const DOCUMENT_STYLE_ID = "__refract_tool_runtime_document_styles";

declare global {
  interface Window {
    [RUNTIME_KEY]?: RefractRuntimeBridge;
  }
}

function ensureRuntimeDocumentStyles(): void {
  let styleTag = document.getElementById(DOCUMENT_STYLE_ID);
  if (!(styleTag instanceof HTMLStyleElement)) {
    styleTag = document.createElement("style");
    styleTag.id = DOCUMENT_STYLE_ID;
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = runtimeDocumentStyles;
}

class RefractRuntimeBridge {
  private readonly host: HTMLDivElement;
  private readonly shadowRoot: ShadowRoot;
  private readonly mirroredStyleContainer: HTMLDivElement;
  private readonly root: Root;
  private readonly headObserver: MutationObserver;
  private options: RefractRuntimeInitOptions;
  private mirrorSyncQueued = false;

  constructor(options: RefractRuntimeInitOptions) {
    this.options = options;

    this.host = document.createElement("div");
    this.host.id = HOST_ID;

    this.shadowRoot = this.host.attachShadow({ mode: "open" });
    this.mirroredStyleContainer = document.createElement("div");
    this.mirroredStyleContainer.setAttribute("data-refract-style-mirror", "true");

    const style = document.createElement("style");
    style.textContent = runtimeStyles;

    const mountPoint = document.createElement("div");
    this.shadowRoot.append(this.mirroredStyleContainer, style, mountPoint);
    this.syncMirroredStyles();
    this.headObserver = new MutationObserver(() => {
      this.scheduleMirroredStyleSync();
    });
    this.observeHeadForStyleChanges();

    this.root = createRoot(mountPoint);
  }

  mount(): void {
    const existingHost = document.getElementById(HOST_ID);
    if (existingHost) {
      existingHost.remove();
    }

    ensureRuntimeDocumentStyles();
    document.body.setAttribute("data-refract-tool-runtime", "active");
    document.body.appendChild(this.host);
    this.render();
  }

  updateOptions(options: RefractRuntimeInitOptions): void {
    this.options = options;
    this.syncMirroredStyles();
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

  private observeHeadForStyleChanges(): void {
    if (!document.head) {
      return;
    }

    this.headObserver.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "media", "rel"]
    });
  }

  private scheduleMirroredStyleSync(): void {
    if (this.mirrorSyncQueued) {
      return;
    }

    this.mirrorSyncQueued = true;
    queueMicrotask(() => {
      this.mirrorSyncQueued = false;
      this.syncMirroredStyles();
    });
  }

  private syncMirroredStyles(): void {
    if (!document.head) {
      return;
    }

    const mirroredNodes: Array<HTMLStyleElement | HTMLLinkElement> = [];
    const sourceNodes = document.head.querySelectorAll("style, link[rel='stylesheet']");

    for (const sourceNode of sourceNodes) {
      if (sourceNode instanceof HTMLStyleElement) {
        const clonedStyle = document.createElement("style");
        const media = sourceNode.getAttribute("media");
        const nonce = sourceNode.getAttribute("nonce");

        if (media) {
          clonedStyle.setAttribute("media", media);
        }
        if (nonce) {
          clonedStyle.setAttribute("nonce", nonce);
        }

        clonedStyle.textContent = sourceNode.textContent ?? "";
        mirroredNodes.push(clonedStyle);
        continue;
      }

      if (sourceNode instanceof HTMLLinkElement && sourceNode.href) {
        const clonedLink = document.createElement("link");
        const nonce = sourceNode.getAttribute("nonce");
        const crossOrigin = sourceNode.getAttribute("crossorigin");
        const integrity = sourceNode.getAttribute("integrity");
        const referrerPolicy = sourceNode.getAttribute("referrerpolicy");

        clonedLink.rel = "stylesheet";
        clonedLink.href = sourceNode.href;

        if (sourceNode.media) {
          clonedLink.media = sourceNode.media;
        }
        if (nonce) {
          clonedLink.setAttribute("nonce", nonce);
        }
        if (crossOrigin !== null) {
          clonedLink.setAttribute("crossorigin", crossOrigin);
        }
        if (integrity) {
          clonedLink.integrity = integrity;
        }
        if (referrerPolicy) {
          clonedLink.referrerPolicy = referrerPolicy;
        }

        mirroredNodes.push(clonedLink);
      }
    }

    this.mirroredStyleContainer.replaceChildren(...mirroredNodes);
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
