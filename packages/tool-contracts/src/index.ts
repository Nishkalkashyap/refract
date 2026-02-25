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

export interface RefractPlugin<InvokePayload = unknown, InvokeResult = unknown>
  extends RefractRuntimePlugin<InvokePayload, InvokeResult> {
  serverHandler?: RefractServerHandler<InvokePayload, InvokeResult>;
}

export interface RefractRuntimeInitOptions {
  plugins: RefractRuntimePlugin[];
  defaultPluginId?: string;
}

export interface RefractRuntimeManifestPlugin {
  id: string;
  browserModule: string;
}

export interface RefractRuntimeBootstrapPayload {
  plugins: RefractRuntimeManifestPlugin[];
  defaultPluginId?: string;
}

export interface RefractServerInvokeRequest<InvokePayload = unknown> {
  pluginId: string;
  selectionRef: RefractSelectionRef;
  payload: InvokePayload;
}

const REFRACT_BROWSER_MODULE_URL = Symbol.for("refract.browser-module-url");

type RefractBrowserModuleCarrier = {
  [REFRACT_BROWSER_MODULE_URL]?: string;
};

export function defineRefractBrowserPlugin<
  InvokePayload = unknown,
  InvokeResult = unknown
>(
  browserModuleUrl: string,
  plugin: RefractRuntimePlugin<InvokePayload, InvokeResult>
): RefractRuntimePlugin<InvokePayload, InvokeResult> {
  if (!browserModuleUrl) {
    throw new Error("defineRefractBrowserPlugin requires browserModuleUrl.");
  }

  Object.defineProperty(plugin as RefractBrowserModuleCarrier, REFRACT_BROWSER_MODULE_URL, {
    value: browserModuleUrl,
    enumerable: false,
    configurable: false,
    writable: false
  });

  return plugin;
}

export function withRefractServerHandler<
  InvokePayload = unknown,
  InvokeResult = unknown
>(
  browserPlugin: RefractRuntimePlugin<InvokePayload, InvokeResult>,
  serverHandler: RefractServerHandler<InvokePayload, InvokeResult>
): RefractPlugin<InvokePayload, InvokeResult> {
  (browserPlugin as RefractPlugin<InvokePayload, InvokeResult>).serverHandler =
    serverHandler;
  return browserPlugin as RefractPlugin<InvokePayload, InvokeResult>;
}

export function getRefractBrowserModuleUrl(
  plugin: RefractRuntimePlugin | RefractPlugin
): string | null {
  const candidate = (plugin as RefractBrowserModuleCarrier)[REFRACT_BROWSER_MODULE_URL];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}
