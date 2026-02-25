import path from "node:path";
import { createRequire } from "node:module";

import type {
  ToolActionRegistration,
  ToolRuntimeBootstrapPayload,
  ToolRuntimeManifestAction,
  ToolServerOperationHandler
} from "@refract/tool-contracts";
import type { Plugin } from "vite";

import { ActionBridge, type ActionBridgeAction } from "./action-bridge.ts";
import { JsxInstrumentation } from "./jsx-instrumentation.ts";
import { RuntimeInjection } from "./runtime-injection.ts";

interface ResolvedActionRegistration extends ToolRuntimeManifestAction, ActionBridgeAction {
  serverOperations: Record<string, ToolServerOperationHandler>;
}

export interface ToolPluginOptions {
  actions: ToolActionRegistration[];
  defaultActionId?: string;
}

class ToolPluginController {
  private readonly actions: ResolvedActionRegistration[];
  private readonly defaultActionId: string | undefined;
  private readonly actionBridge: ActionBridge;
  private readonly jsxInstrumentation: JsxInstrumentation;
  private readonly runtimeInjection: RuntimeInjection;

  private root = "";
  private runtimePayload: ToolRuntimeBootstrapPayload | null = null;
  private runtimeBootstrapModule = "";

  constructor(private readonly options: ToolPluginOptions) {
    this.actions = this.resolveActionRegistrations(options.actions);
    this.defaultActionId = options.defaultActionId ?? this.actions[0]?.id;

    if (
      this.defaultActionId &&
      !this.actions.some((action) => action.id === this.defaultActionId)
    ) {
      throw new Error(
        `toolPlugin defaultActionId '${this.defaultActionId}' is not present in registered actions.`
      );
    }

    this.actionBridge = new ActionBridge({
      actions: this.actions,
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

  private resolveActionRegistrations(
    actions: ToolActionRegistration[]
  ): ResolvedActionRegistration[] {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error("toolPlugin requires at least one action registration.");
    }

    const seenIds = new Set<string>();

    return actions.map((action) => {
      if (!action || typeof action !== "object") {
        throw new Error("toolPlugin received an invalid action registration.");
      }

      if (!action.id || seenIds.has(action.id)) {
        throw new Error(`toolPlugin action id '${action.id}' is missing or duplicated.`);
      }

      seenIds.add(action.id);

      if (!action.runtimeModule || !action.runtimeExport) {
        throw new Error(
          `toolPlugin action '${action.id}' is missing runtime module metadata.`
        );
      }

      return {
        id: action.id,
        runtimeModule: action.runtimeModule,
        runtimeExport: action.runtimeExport,
        serverOperations: action.serverOperations ?? {}
      };
    });
  }

  private createRuntimePayload(projectRoot: string): ToolRuntimeBootstrapPayload {
    return {
      actions: this.actions.map((action) => ({
        id: action.id,
        runtimeModule: this.resolveRuntimeModuleForBrowser(action.runtimeModule, projectRoot),
        runtimeExport: action.runtimeExport
      })),
      ...(this.defaultActionId ? { defaultActionId: this.defaultActionId } : {})
    };
  }

  private resolveRuntimeModuleForBrowser(runtimeModule: string, projectRoot: string): string {
    if (
      runtimeModule.startsWith("/@fs/") ||
      runtimeModule.startsWith("/@id/") ||
      runtimeModule.startsWith("http://") ||
      runtimeModule.startsWith("https://")
    ) {
      return runtimeModule;
    }

    if (runtimeModule.startsWith("./") || runtimeModule.startsWith("../")) {
      return this.toViteFsPath(path.resolve(projectRoot, runtimeModule));
    }

    if (path.isAbsolute(runtimeModule)) {
      return this.toViteFsPath(runtimeModule);
    }

    const projectRequire = createRequire(path.join(projectRoot, "package.json"));
    return this.toViteFsPath(projectRequire.resolve(runtimeModule));
  }

  private toViteFsPath(absolutePath: string): string {
    return `/@fs/${absolutePath.replace(/\\/g, "/")}`;
  }
}

export function toolPlugin(options: ToolPluginOptions): Plugin {
  const controller = new ToolPluginController(options);

  return {
    name: "refract-tool-plugin",
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
