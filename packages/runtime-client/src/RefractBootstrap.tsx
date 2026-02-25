"use client";

import { useEffect } from "react";

import type { RefractRuntimeInitOptions } from "@nkstack/refract-tool-contracts";

import { initToolRuntime } from "./index";

export interface RefractBootstrapProps extends RefractRuntimeInitOptions {
  enabled?: boolean;
}

export function RefractBootstrap({
  plugins,
  defaultPluginId,
  serverEndpoint,
  enabled = isDevelopmentRuntime()
}: RefractBootstrapProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    initToolRuntime({
      plugins,
      defaultPluginId,
      serverEndpoint
    });
  }, [defaultPluginId, enabled, plugins, serverEndpoint]);

  return null;
}

function isDevelopmentRuntime(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === "development";
  }

  return true;
}
