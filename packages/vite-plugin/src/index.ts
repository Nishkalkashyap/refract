import path from "node:path";
import { createRequire } from "node:module";

import type {
  ToolActionRegistration,
  ToolRuntimeBootstrapPayload,
  ToolRuntimeManifestAction,
  ToolServerOperationHandler
} from "@refract/tool-contracts";
import type { Plugin } from "vite";

import { createActionBridgeMiddleware } from "./action-bridge.ts";
import { transformJsxForToolMetadata } from "./jsx-instrumentation.ts";
import { createRuntimeInjectionTag } from "./runtime-injection.ts";

interface ResolvedActionRegistration extends ToolRuntimeManifestAction {
  serverOperations: Record<string, ToolServerOperationHandler>;
}

export interface ToolPluginOptions {
  actions: ToolActionRegistration[];
  defaultActionId?: string;
}

export function toolPlugin(options: ToolPluginOptions): Plugin {
  const actions = resolveActionRegistrations(options.actions);

  const defaultActionId = options.defaultActionId ?? actions[0]?.id;
  if (defaultActionId && !actions.some((action) => action.id === defaultActionId)) {
    throw new Error(
      `toolPlugin defaultActionId '${defaultActionId}' is not present in registered actions.`
    );
  }

  let root = "";
  let runtimePayload: ToolRuntimeBootstrapPayload | null = null;
  let runtimeBootstrapModule = "";

  return {
    name: "refract-tool-plugin",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
      runtimePayload = createRuntimePayload(actions, defaultActionId, root);
      runtimeBootstrapModule = resolveRuntimeModuleForBrowser(
        "@refract/runtime-client/bootstrap",
        root
      );
    },
    configureServer(server) {
      server.middlewares.use(
        createActionBridgeMiddleware({
          actions,
          getProjectRoot: () => root
        })
      );
    },
    transformIndexHtml() {
      const projectRoot = root || process.cwd();
      const payload =
        runtimePayload ?? createRuntimePayload(actions, defaultActionId, projectRoot);
      const bootstrapModule =
        runtimeBootstrapModule ||
        resolveRuntimeModuleForBrowser(
          "@refract/runtime-client/bootstrap",
          projectRoot
        );

      return [createRuntimeInjectionTag(payload, bootstrapModule)];
    },
    transform(code, id) {
      return transformJsxForToolMetadata({
        code,
        id,
        root
      });
    }
  };
}

function resolveActionRegistrations(
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

function createRuntimePayload(
  actions: ResolvedActionRegistration[],
  defaultActionId: string | undefined,
  projectRoot: string
): ToolRuntimeBootstrapPayload {
  return {
    actions: actions.map((action) => ({
      id: action.id,
      runtimeModule: resolveRuntimeModuleForBrowser(action.runtimeModule, projectRoot),
      runtimeExport: action.runtimeExport
    })),
    ...(defaultActionId ? { defaultActionId } : {})
  };
}

function resolveRuntimeModuleForBrowser(runtimeModule: string, projectRoot: string): string {
  if (
    runtimeModule.startsWith("/@fs/") ||
    runtimeModule.startsWith("/@id/") ||
    runtimeModule.startsWith("http://") ||
    runtimeModule.startsWith("https://")
  ) {
    return runtimeModule;
  }

  if (runtimeModule.startsWith("./") || runtimeModule.startsWith("../")) {
    return toViteFsPath(path.resolve(projectRoot, runtimeModule));
  }

  if (path.isAbsolute(runtimeModule)) {
    return toViteFsPath(runtimeModule);
  }

  const projectRequire = createRequire(path.join(projectRoot, "package.json"));
  return toViteFsPath(projectRequire.resolve(runtimeModule));
}

function toViteFsPath(absolutePath: string): string {
  return `/@fs/${absolutePath.replace(/\\/g, "/")}`;
}
