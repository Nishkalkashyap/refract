import type {
  RefractRuntimeBootstrapPayload,
  RefractRuntimeManifestPlugin,
  RefractRuntimePlugin
} from "@nkstack/refract-tool-contracts";

import { initToolRuntime } from "./index";

export class RuntimeBootstrapper {
  async bootstrap(payload: RefractRuntimeBootstrapPayload): Promise<void> {
    const settledModules = await Promise.allSettled(
      payload.plugins.map(async (plugin) => ({
        plugin,
        moduleNamespace: await import(/* @vite-ignore */ plugin.browserModule)
      }))
    );

    const runtimePlugins: RefractRuntimePlugin[] = [];

    for (const settled of settledModules) {
      if (settled.status === "rejected") {
        console.warn("[refract] Failed to load runtime plugin module.", settled.reason);
        continue;
      }

      const { plugin, moduleNamespace } = settled.value;
      const runtimePlugin = this.resolveRuntimePlugin(plugin, moduleNamespace);
      if (runtimePlugin) {
        runtimePlugins.push(runtimePlugin);
      }
    }

    const defaultPluginId = this.resolveDefaultPluginId(
      payload.defaultPluginId,
      runtimePlugins
    );

    initToolRuntime({
      plugins: runtimePlugins,
      ...(defaultPluginId ? { defaultPluginId } : {})
    });
  }

  private resolveRuntimePlugin(
    manifestPlugin: RefractRuntimeManifestPlugin,
    moduleNamespace: unknown
  ): RefractRuntimePlugin | null {
    if (typeof moduleNamespace !== "object" || moduleNamespace === null) {
      console.warn(`[refract] Invalid runtime plugin module for '${manifestPlugin.id}'.`);
      return null;
    }

    const runtimePlugin = (moduleNamespace as { default?: unknown }).default;
    if (!this.isRefractRuntimePlugin(runtimePlugin)) {
      console.warn(
        `[refract] Runtime module default export is invalid for plugin '${manifestPlugin.id}'.`
      );
      return null;
    }

    return runtimePlugin;
  }

  private isRefractRuntimePlugin(candidate: unknown): candidate is RefractRuntimePlugin {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }

    const plugin = candidate as Record<string, unknown>;

    if (
      typeof plugin.id !== "string" ||
      typeof plugin.label !== "string" ||
      typeof plugin.inBrowserHandler !== "function"
    ) {
      return false;
    }

    if (typeof plugin.Panel !== "undefined" && typeof plugin.Panel !== "function") {
      return false;
    }

    return true;
  }

  private resolveDefaultPluginId(
    requestedDefaultPluginId: string | undefined,
    plugins: RefractRuntimePlugin[]
  ): string | undefined {
    if (!requestedDefaultPluginId) {
      return plugins[0]?.id;
    }

    if (plugins.some((plugin) => plugin.id === requestedDefaultPluginId)) {
      return requestedDefaultPluginId;
    }

    console.warn(
      `[refract] defaultPluginId '${requestedDefaultPluginId}' was not loaded. Falling back to the first available plugin.`
    );
    return plugins[0]?.id;
  }
}

export async function bootstrapToolRuntime(
  payload: RefractRuntimeBootstrapPayload
): Promise<void> {
  return new RuntimeBootstrapper().bootstrap(payload);
}
