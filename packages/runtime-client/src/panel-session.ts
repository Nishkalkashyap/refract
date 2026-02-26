import type { RefractRuntimePlugin, RefractSelectionRef } from "@nkstack/refract-tool-contracts";

export interface PanelSession {
  plugin: RefractRuntimePlugin;
  selectionRef: RefractSelectionRef;
  element: HTMLElement;
  anchorPoint: {
    x: number;
    y: number;
  };
}
