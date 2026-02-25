import { promises as fs } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import { parse, type ParserPlugin } from "@babel/parser";
import type {
  RefractFileContext,
  RefractSelectionRef,
  RefractServerPlugin,
  RefractServerInvokeRequest,
  RefractServerResult
} from "@nkstack/refract-tool-contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRefractServerPlugin = RefractServerPlugin<any, any>;

export interface ActionBridgeOptions {
  plugins: AnyRefractServerPlugin[];
  getProjectRoot: () => string;
  endpoint: string;
}

export class ActionBridge {
  private readonly plugins: AnyRefractServerPlugin[];
  private readonly getProjectRoot: () => string;
  private readonly endpoint: string;

  constructor(options: ActionBridgeOptions) {
    this.plugins = options.plugins;
    this.getProjectRoot = options.getProjectRoot;
    this.endpoint = options.endpoint;
  }

  readonly middleware = async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) => {
    const pathname = (request.url ?? "").split("?")[0];
    if (request.method !== "POST" || pathname !== this.endpoint) {
      next();
      return;
    }

    const payload = await this.readRequestBody(request);
    if (!payload) {
      this.respondJson(response, 400, {
        ok: false,
        code: "INVALID_PAYLOAD",
        message: "Expected a valid JSON object payload."
      });
      return;
    }

    const invokeRequest = this.parseInvokeRequest(payload);
    if (!invokeRequest) {
      this.respondJson(response, 400, {
        ok: false,
        code: "INVALID_PAYLOAD",
        message: "Payload must include pluginId, selectionRef, and payload."
      });
      return;
    }

    const plugin = this.plugins.find((candidate) => candidate.id === invokeRequest.pluginId);
    if (!plugin) {
      this.respondJson(response, 404, {
        ok: false,
        code: "PLUGIN_NOT_FOUND",
        message: `Unknown plugin '${invokeRequest.pluginId}'.`
      });
      return;
    }

    const projectRoot = this.getProjectRoot();
    const absoluteFilePath = this.resolveSelectionFilePath(
      invokeRequest.selectionRef.file,
      projectRoot
    );
    if (!absoluteFilePath || !this.isWithinRoot(absoluteFilePath, projectRoot)) {
      this.respondJson(response, 403, {
        ok: false,
        code: "FORBIDDEN_PATH",
        message: "Requested file path is outside project root."
      });
      return;
    }

    const fileContext = await this.createFileContext(absoluteFilePath);
    if (!fileContext.ok) {
      this.respondServerResult(response, fileContext.result);
      return;
    }

    try {
      const result = await plugin.serverHandler({
        selectionRef: invokeRequest.selectionRef,
        payload: invokeRequest.payload,
        projectRoot,
        file: fileContext.context
      });

      this.respondServerResult(response, result);
    } catch {
      this.respondJson(response, 500, {
        ok: false,
        code: "SERVER_HANDLER_ERROR",
        message: "Unhandled exception while executing plugin server handler."
      });
    }
  };

  private parseInvokeRequest(
    value: Record<string, unknown>
  ): RefractServerInvokeRequest | null {
    const pluginId = typeof value.pluginId === "string" ? value.pluginId : "";
    const selectionRef = this.parseSelectionRef(value.selectionRef);

    if (!pluginId || !selectionRef || !Object.prototype.hasOwnProperty.call(value, "payload")) {
      return null;
    }

    return {
      pluginId,
      selectionRef,
      payload: value.payload
    };
  }

  private parseSelectionRef(value: unknown): RefractSelectionRef | null {
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

  private resolveSelectionFilePath(selectionFile: string, root: string): string | null {
    const normalizedFile = selectionFile.replace(/\\/g, "/");
    const relativeFile = normalizedFile.startsWith("/")
      ? normalizedFile.slice(1)
      : normalizedFile;

    if (!relativeFile) {
      return null;
    }

    return path.resolve(root, relativeFile);
  }

  private async createFileContext(
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
        plugins: this.getParserPlugins(absoluteFilePath)
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

  private getParserPlugins(absoluteFilePath: string): ParserPlugin[] {
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

  private respondServerResult(response: ServerResponse, result: RefractServerResult): void {
    if (result.ok) {
      this.respondJson(response, 200, result);
      return;
    }

    this.respondJson(response, result.status ?? 400, result);
  }

  private respondJson(response: ServerResponse, statusCode: number, payload: unknown): void {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(payload));
  }

  private async readRequestBody(
    request: IncomingMessage
  ): Promise<Record<string, unknown> | null> {
    const chunks: string[] = [];

    return new Promise((resolve) => {
      request.on("data", (chunk) => {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      });

      request.on("end", () => {
        const raw = chunks.join("").trim();
        if (!raw) {
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === "object" && parsed !== null) {
            resolve(parsed as Record<string, unknown>);
            return;
          }
        } catch {
          resolve(null);
          return;
        }

        resolve(null);
      });

      request.on("error", () => resolve(null));
    });
  }

  private isWithinRoot(candidatePath: string, root: string): boolean {
    const relative = path.relative(root, candidatePath);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
      ? true
      : candidatePath === root;
  }
}
