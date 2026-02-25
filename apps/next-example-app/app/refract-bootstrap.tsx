"use client";

import { RefractBootstrap } from "@nkstack/refract-runtime-client";
import { tailwindEditorRuntimePlugin } from "@nkstack/refract-tailwind-editor-action/runtime";

import { DEFAULT_REFRACT_PLUGIN_ID } from "../refract-constants";

export function RefractRuntimeBootstrap() {
  return (
    <RefractBootstrap
      plugins={[tailwindEditorRuntimePlugin]}
      defaultPluginId={DEFAULT_REFRACT_PLUGIN_ID}
    />
  );
}
