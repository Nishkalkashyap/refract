import { promises as fs } from "node:fs";
import path from "node:path";

import { parse, type ParserPlugin } from "@babel/parser";
import type {
  RefractFileContext,
  RefractSelectionRef,
  RefractServerInvokeRequest,
  RefractServerPlugin,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT = "/api/refract/plugin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRefractServerPlugin = RefractServerPlugin<any, any>;

export interface CreateRefractRouteHandlerOptions {
  serverPlugins: AnyRefractServerPlugin[];
  endpoint?: string;
  projectRoot?: string;
  enabled?: boolean;
}

export function createRefractRouteHandler(options: CreateRefractRouteHandlerOptions) {
  const endpoint = normalizeEndpoint(options.endpoint);
  const enabled = options.enabled ?? process.env.NODE_ENV === "development";
  const projectRoot = options.projectRoot ?? process.cwd();
  const pluginsById = createPluginMap(options.serverPlugins);

  return async function handleRefractRoute(request: NextRequest) {
    if (!enabled) {
      return NextResponse.json(
        {
          ok: false,
          code: "DISABLED",
          message: "Refract is disabled for this environment."
        },
        { status: 404 }
      );
    }

    if (request.nextUrl.pathname !== endpoint) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Route endpoint does not match Refract configuration."
        },
        { status: 404 }
      );
    }

    const payload = await readJsonPayload(request);
    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Expected a valid JSON object payload."
        },
        { status: 400 }
      );
    }

    const invokeRequest = parseInvokeRequest(payload);
    if (!invokeRequest) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Payload must include pluginId, selectionRef, and payload."
        },
        { status: 400 }
      );
    }

    const plugin = pluginsById.get(invokeRequest.pluginId);
    if (!plugin) {
      return NextResponse.json(
        {
          ok: false,
          code: "PLUGIN_NOT_FOUND",
          message: `Unknown plugin '${invokeRequest.pluginId}'.`
        },
        { status: 404 }
      );
    }

    const absoluteFilePath = resolveSelectionFilePath(invokeRequest.selectionRef.file, projectRoot);
    if (!absoluteFilePath || !isWithinRoot(absoluteFilePath, projectRoot)) {
      return NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN_PATH",
          message: "Requested file path is outside project root."
        },
        { status: 403 }
      );
    }

    const fileContext = await createFileContext(absoluteFilePath);
    if (!fileContext.ok) {
      return NextResponse.json(fileContext.result, {
        status: getResponseStatus(fileContext.result)
      });
    }

    try {
      const result = await plugin.serverHandler({
        selectionRef: invokeRequest.selectionRef,
        payload: invokeRequest.payload,
        projectRoot,
        file: fileContext.context
      });
      return NextResponse.json(result, { status: getResponseStatus(result) });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "SERVER_HANDLER_ERROR",
          message: "Unhandled exception while executing plugin server handler."
        },
        { status: 500 }
      );
    }
  };
}

function createPluginMap(serverPlugins: AnyRefractServerPlugin[]) {
  if (!Array.isArray(serverPlugins)) {
    throw new Error("createRefractRouteHandler requires 'serverPlugins' to be an array.");
  }

  const pluginsById = new Map<string, AnyRefractServerPlugin>();
  for (const plugin of serverPlugins) {
    if (!plugin || typeof plugin !== "object") {
      throw new Error("Refract received an invalid server plugin registration.");
    }

    if (!plugin.id || typeof plugin.serverHandler !== "function") {
      throw new Error("Each server plugin must define id and serverHandler.");
    }

    if (pluginsById.has(plugin.id)) {
      throw new Error(`Server plugin id '${plugin.id}' is duplicated.`);
    }

    pluginsById.set(plugin.id, plugin);
  }

  return pluginsById;
}

function normalizeEndpoint(endpoint: string | undefined): string {
  const trimmed = endpoint?.trim();
  if (!trimmed) {
    return DEFAULT_ENDPOINT;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function readJsonPayload(
  request: NextRequest
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }

    return null;
  } catch {
    return null;
  }
}

function parseInvokeRequest(value: Record<string, unknown>): RefractServerInvokeRequest | null {
  const pluginId = typeof value.pluginId === "string" ? value.pluginId : "";
  const selectionRef = parseSelectionRef(value.selectionRef);

  if (!pluginId || !selectionRef || !Object.prototype.hasOwnProperty.call(value, "payload")) {
    return null;
  }

  return {
    pluginId,
    selectionRef,
    payload: value.payload
  };
}

function parseSelectionRef(value: unknown): RefractSelectionRef | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    file?: unknown;
    line?: unknown;
    column?: unknown;
    tagName?: unknown;
  };

  const line = candidate.line;

  if (
    typeof candidate.file !== "string" ||
    typeof line !== "number" ||
    !Number.isInteger(line) ||
    line < 1 ||
    typeof candidate.tagName !== "string"
  ) {
    return null;
  }

  const column = typeof candidate.column === "number" ? candidate.column : undefined;
  if (typeof column === "number" && (!Number.isInteger(column) || column < 1)) {
    return null;
  }

  return {
    file: candidate.file,
    line,
    tagName: candidate.tagName,
    ...(typeof column === "number" ? { column } : {})
  };
}

function resolveSelectionFilePath(selectionFile: string, root: string): string | null {
  const normalizedFile = selectionFile.replace(/\\/g, "/");
  const relativeFile = normalizedFile.startsWith("/")
    ? normalizedFile.slice(1)
    : normalizedFile;

  if (!relativeFile) {
    return null;
  }

  return path.resolve(root, relativeFile);
}

async function createFileContext(
  absoluteFilePath: string
): Promise<
  | { ok: true; context: RefractFileContext }
  | { ok: false; result: RefractServerResult }
> {
  let sourceText: string;
  try {
    sourceText = await fs.readFile(absoluteFilePath, "utf8");
  } catch {
    return {
      ok: false,
      result: {
        ok: false,
        code: "FILE_READ_ERROR",
        message: "Failed to read selected source file.",
        status: 404
      }
    };
  }

  let ast: unknown;
  try {
    ast = parse(sourceText, {
      sourceType: "module",
      plugins: getParserPlugins(absoluteFilePath)
    });
  } catch {
    return {
      ok: false,
      result: {
        ok: false,
        code: "AST_PARSE_ERROR",
        message: "Failed to parse source file AST for plugin server handler.",
        status: 400
      }
    };
  }

  const context: RefractFileContext = {
    absolutePath: absoluteFilePath,
    sourceText,
    ast,
    writeSourceText: async (next: string) => {
      await fs.writeFile(absoluteFilePath, next, "utf8");
      context.sourceText = next;
    }
  };

  return { ok: true, context };
}

function getParserPlugins(absoluteFilePath: string): ParserPlugin[] {
  if (absoluteFilePath.endsWith(".tsx")) {
    return ["jsx", "typescript"];
  }

  if (absoluteFilePath.endsWith(".ts")) {
    return ["typescript"];
  }

  if (absoluteFilePath.endsWith(".jsx")) {
    return ["jsx"];
  }

  return ["jsx"];
}

function isWithinRoot(candidatePath: string, root: string): boolean {
  const relative = path.relative(root, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? true
    : candidatePath === root;
}

function getResponseStatus(result: RefractServerResult): number {
  if (result.ok) {
    return 200;
  }

  return result.status ?? 400;
}
