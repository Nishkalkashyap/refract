import type { RefractServerPlugin } from "@nkstack/refract-tool-contracts";
import type { Plugin } from "vite";

import { ActionBridge } from "./action-bridge.ts";
import { JsxInstrumentation } from "./jsx-instrumentation.ts";

const DEFAULT_ENDPOINT = "/api/refract/plugin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRefractServerPlugin = RefractServerPlugin<any, any>;

export interface RefractVitePluginOptions {
  serverPlugins: AnyRefractServerPlugin[];
  endpoint?: string;
}

class RefractPluginController {
  private readonly serverPlugins: AnyRefractServerPlugin[];
  private readonly endpoint: string;
  private readonly jsxInstrumentation: JsxInstrumentation;

  private root = "";
  private actionBridge: ActionBridge;

  constructor(options: RefractVitePluginOptions) {
    this.serverPlugins = this.resolveServerPlugins(options.serverPlugins);
    this.endpoint = this.normalizeEndpoint(options.endpoint);
    this.jsxInstrumentation = new JsxInstrumentation();
    this.actionBridge = new ActionBridge({
      plugins: this.serverPlugins,
      getProjectRoot: () => this.root,
      endpoint: this.endpoint
    });
  }

  onConfigResolved(projectRoot: string): void {
    this.root = projectRoot;
    this.actionBridge = new ActionBridge({
      plugins: this.serverPlugins,
      getProjectRoot: () => this.root,
      endpoint: this.endpoint
    });
  }

  configureServer() {
    return this.actionBridge.middleware;
  }

  transform(code: string, id: string) {
    return this.jsxInstrumentation.transform({
      code,
      id,
      root: this.root
    });
  }

  private resolveServerPlugins(
    serverPlugins: AnyRefractServerPlugin[]
  ): AnyRefractServerPlugin[] {
    if (!Array.isArray(serverPlugins)) {
      throw new Error("refract requires 'serverPlugins' to be an array.");
    }

    const seenIds = new Set<string>();

    for (const plugin of serverPlugins) {
      if (!plugin || typeof plugin !== "object") {
        throw new Error("refract received an invalid server plugin registration.");
      }

      if (!plugin.id || seenIds.has(plugin.id)) {
        throw new Error(`refract server plugin id '${plugin.id}' is missing or duplicated.`);
      }

      if (typeof plugin.serverHandler !== "function") {
        throw new Error(`refract server plugin '${plugin.id}' must define serverHandler.`);
      }

      seenIds.add(plugin.id);
    }

    return serverPlugins;
  }

  private normalizeEndpoint(endpoint: string | undefined): string {
    const trimmed = endpoint?.trim();
    if (!trimmed) {
      return DEFAULT_ENDPOINT;
    }

    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

export function refract(options: RefractVitePluginOptions): Plugin {
  const controller = new RefractPluginController(options);

  return {
    name: "refract-plugin",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      controller.onConfigResolved(config.root);
    },
    configureServer(server) {
      server.middlewares.use(controller.configureServer());
    },
    transform(code, id) {
      return controller.transform(code, id);
    }
  };
}
