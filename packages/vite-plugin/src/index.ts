import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import type {
  RefractPlugin,
  RefractRuntimeBootstrapPayload,
  RefractServerHandler
} from "@refract/tool-contracts";
import { getRefractBrowserModuleUrl } from "@refract/tool-contracts";
import type { Plugin } from "vite";

import { ActionBridge, type ActionBridgePlugin } from "./action-bridge.ts";
import { JsxInstrumentation } from "./jsx-instrumentation.ts";
import { RuntimeInjection } from "./runtime-injection.ts";

interface ResolvedPluginRegistration extends ActionBridgePlugin {
  browserModuleUrl: string;
  serverHandler?: RefractServerHandler;
}

export interface RefractVitePluginOptions {
  plugins: RefractPlugin[];
  defaultPluginId?: string;
}

class RefractPluginController {
  private readonly plugins: ResolvedPluginRegistration[];
  private readonly defaultPluginId: string | undefined;
  private readonly actionBridge: ActionBridge;
  private readonly jsxInstrumentation: JsxInstrumentation;
  private readonly runtimeInjection: RuntimeInjection;

  private root = "";
  private runtimePayload: RefractRuntimeBootstrapPayload | null = null;
  private runtimeBootstrapModule = "";

  constructor(options: RefractVitePluginOptions) {
    this.plugins = this.resolvePluginRegistrations(options.plugins);
    this.defaultPluginId = options.defaultPluginId ?? this.plugins[0]?.id;

    if (
      this.defaultPluginId &&
      !this.plugins.some((plugin) => plugin.id === this.defaultPluginId)
    ) {
      throw new Error(
        `refract defaultPluginId '${this.defaultPluginId}' is not present in registered plugins.`
      );
    }

    this.actionBridge = new ActionBridge({
      plugins: this.plugins,
      getProjectRoot: () => this.root
    });
    this.jsxInstrumentation = new JsxInstrumentation();
    this.runtimeInjection = new RuntimeInjection();
  }

  onConfigResolved(projectRoot: string): void {
    this.root = projectRoot;
    this.runtimePayload = this.createRuntimePayload(projectRoot);
    this.runtimeBootstrapModule = this.resolveRuntimeModuleForBrowser(
      "@refract/runtime-client/bootstrap",
      projectRoot
    );
  }

  configureServer() {
    return this.actionBridge.middleware;
  }

  transformIndexHtml() {
    const projectRoot = this.root || process.cwd();
    const payload = this.runtimePayload ?? this.createRuntimePayload(projectRoot);
    const bootstrapModule =
      this.runtimeBootstrapModule ||
      this.resolveRuntimeModuleForBrowser(
        "@refract/runtime-client/bootstrap",
        projectRoot
      );

    return [this.runtimeInjection.createTag(payload, bootstrapModule)];
  }

  transform(code: string, id: string) {
    return this.jsxInstrumentation.transform({
      code,
      id,
      root: this.root
    });
  }

  private resolvePluginRegistrations(plugins: RefractPlugin[]): ResolvedPluginRegistration[] {
    if (!Array.isArray(plugins) || plugins.length === 0) {
      throw new Error("refract requires at least one plugin registration.");
    }

    const seenIds = new Set<string>();

    return plugins.map((plugin) => {
      if (!plugin || typeof plugin !== "object") {
        throw new Error("refract received an invalid plugin registration.");
      }

      if (!plugin.id || seenIds.has(plugin.id)) {
        throw new Error(`refract plugin id '${plugin.id}' is missing or duplicated.`);
      }

      seenIds.add(plugin.id);

      if (!plugin.label || typeof plugin.inBrowserHandler !== "function") {
        throw new Error(
          `refract plugin '${plugin.id}' must define label and inBrowserHandler.`
        );
      }

      const browserModuleUrl = getRefractBrowserModuleUrl(plugin);
      if (!browserModuleUrl) {
        throw new Error(
          `refract plugin '${plugin.id}' is missing browser module metadata. Export browser plugins using defineRefractBrowserPlugin(import.meta.url, plugin).`
        );
      }

      return {
        id: plugin.id,
        browserModuleUrl,
        serverHandler: plugin.serverHandler
      };
    });
  }

  private createRuntimePayload(projectRoot: string): RefractRuntimeBootstrapPayload {
    return {
      plugins: this.plugins.map((plugin) => ({
        id: plugin.id,
        browserModule: this.resolveRuntimeModuleForBrowser(
          plugin.browserModuleUrl,
          projectRoot
        )
      })),
      ...(this.defaultPluginId ? { defaultPluginId: this.defaultPluginId } : {})
    };
  }

  private resolveRuntimeModuleForBrowser(moduleReference: string, projectRoot: string): string {
    if (
      moduleReference.startsWith("/@fs/") ||
      moduleReference.startsWith("/@id/") ||
      moduleReference.startsWith("http://") ||
      moduleReference.startsWith("https://")
    ) {
      return moduleReference;
    }

    if (moduleReference.startsWith("file://")) {
      return this.toViteFsPath(fileURLToPath(moduleReference));
    }

    if (moduleReference.startsWith("./") || moduleReference.startsWith("../")) {
      return this.toViteFsPath(path.resolve(projectRoot, moduleReference));
    }

    if (path.isAbsolute(moduleReference)) {
      return this.toViteFsPath(moduleReference);
    }

    const projectRequire = createRequire(path.join(projectRoot, "package.json"));
    return this.toViteFsPath(projectRequire.resolve(moduleReference));
  }

  private toViteFsPath(absolutePath: string): string {
    return `/@fs/${absolutePath.replace(/\\/g, "/")}`;
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
    transformIndexHtml() {
      return controller.transformIndexHtml();
    },
    transform(code, id) {
      return controller.transform(code, id);
    }
  };
}
