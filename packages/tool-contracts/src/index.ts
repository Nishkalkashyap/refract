export interface RefractSelectionRef {
  file: string;
  line: number;
  column?: number;
  tagName: string;
}

export interface RefractServerSuccess<Result = unknown> {
  ok: true;
  data?: Result;
}

export interface RefractServerFailure {
  ok: false;
  code: string;
  message: string;
  status?: 400 | 403 | 404 | 409 | 500;
}

export type RefractServerResult<Result = unknown> =
  | RefractServerSuccess<Result>
  | RefractServerFailure;

export interface RefractFileContext {
  absolutePath: string;
  sourceText: string;
  ast: unknown;
  writeSourceText: (next: string) => Promise<void>;
}

export interface RefractServerContext<InvokePayload = unknown> {
  selectionRef: RefractSelectionRef;
  payload: InvokePayload;
  projectRoot: string;
  file: RefractFileContext;
}

export interface RefractServerHandler<InvokePayload = unknown, InvokeResult = unknown> {
  (context: RefractServerContext<InvokePayload>):
    | RefractServerResult<InvokeResult>
    | Promise<RefractServerResult<InvokeResult>>;
}

export interface RefractPanelProps<InvokePayload = unknown, InvokeResult = unknown> {
  selectionRef: RefractSelectionRef;
  element: HTMLElement;
  closePanel: () => void;
  server: {
    invoke: (payload: InvokePayload) => Promise<RefractServerResult<InvokeResult>>;
  };
}

export interface RefractBrowserContext<InvokePayload = unknown, InvokeResult = unknown> {
  selectionRef: RefractSelectionRef;
  element: HTMLElement;
  ui: {
    openPanel: () => void;
    closePanel: () => void;
  };
  server: {
    invoke: (payload: InvokePayload) => Promise<RefractServerResult<InvokeResult>>;
  };
}

export interface RefractRuntimePlugin<InvokePayload = unknown, InvokeResult = unknown> {
  id: string;
  label: string;
  inBrowserHandler: (
    context: RefractBrowserContext<InvokePayload, InvokeResult>
  ) => void | Promise<void>;
  Panel?: (props: RefractPanelProps<InvokePayload, InvokeResult>) => unknown;
}

export interface RefractServerPlugin<InvokePayload = unknown, InvokeResult = unknown> {
  id: string;
  serverHandler: RefractServerHandler<InvokePayload, InvokeResult>;
}

export interface RefractPluginBundle<InvokePayload = unknown, InvokeResult = unknown> {
  runtime: RefractRuntimePlugin<InvokePayload, InvokeResult>;
  server?: RefractServerPlugin<InvokePayload, InvokeResult>;
}

export interface RefractPluginRegistry {
  runtimePlugins: RefractRuntimePlugin[];
  serverPlugins: RefractServerPlugin[];
  defaultPluginId?: string;
}

export interface RefractRuntimeInitOptions {
  plugins: RefractRuntimePlugin[];
  defaultPluginId?: string;
  serverEndpoint?: string;
}

export interface RefractServerInvokeRequest<InvokePayload = unknown> {
  pluginId: string;
  selectionRef: RefractSelectionRef;
  payload: InvokePayload;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRefractPluginBundle = RefractPluginBundle<any, any>;

export function createRefractRegistry(options: {
  plugins: AnyRefractPluginBundle[];
  defaultPluginId?: string;
}): RefractPluginRegistry {
  if (!Array.isArray(options.plugins)) {
    throw new Error("createRefractRegistry requires 'plugins' to be an array.");
  }

  const runtimePlugins: RefractRuntimePlugin[] = [];
  const serverPlugins: RefractServerPlugin[] = [];
  const seenRuntimeIds = new Set<string>();

  for (const pluginBundle of options.plugins) {
    const runtimePlugin = pluginBundle?.runtime;
    if (!runtimePlugin || typeof runtimePlugin !== "object") {
      throw new Error("Each plugin bundle must include a valid runtime plugin.");
    }

    const runtimeId = runtimePlugin.id?.trim();
    if (!runtimeId) {
      throw new Error("Runtime plugin ids must be non-empty strings.");
    }

    if (seenRuntimeIds.has(runtimeId)) {
      throw new Error(`Runtime plugin id '${runtimeId}' is duplicated.`);
    }

    if (
      typeof runtimePlugin.label !== "string" ||
      typeof runtimePlugin.inBrowserHandler !== "function"
    ) {
      throw new Error(
        `Runtime plugin '${runtimeId}' must define label and inBrowserHandler.`
      );
    }

    seenRuntimeIds.add(runtimeId);
    runtimePlugins.push(runtimePlugin);

    const serverPlugin = pluginBundle.server;
    if (typeof serverPlugin === "undefined") {
      continue;
    }

    if (!serverPlugin || typeof serverPlugin !== "object") {
      throw new Error(`Plugin bundle '${runtimeId}' has an invalid server plugin.`);
    }

    if (serverPlugin.id !== runtimeId) {
      throw new Error(
        `Server plugin id '${serverPlugin.id}' must match runtime plugin id '${runtimeId}'.`
      );
    }

    if (typeof serverPlugin.serverHandler !== "function") {
      throw new Error(`Server plugin '${runtimeId}' must define serverHandler.`);
    }

    serverPlugins.push(serverPlugin);
  }

  const requestedDefaultPluginId = options.defaultPluginId;
  if (
    requestedDefaultPluginId &&
    !runtimePlugins.some((plugin) => plugin.id === requestedDefaultPluginId)
  ) {
    throw new Error(
      `defaultPluginId '${requestedDefaultPluginId}' is not present in runtime plugins.`
    );
  }

  const defaultPluginId = requestedDefaultPluginId ?? runtimePlugins[0]?.id;

  return {
    runtimePlugins,
    serverPlugins,
    ...(defaultPluginId ? { defaultPluginId } : {})
  };
}
