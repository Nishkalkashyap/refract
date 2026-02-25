import path from "node:path";
import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse } from "node:http";

import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import type {
  ToolActionOperationRequest,
  ToolActionOperationResult,
  ToolActionRegistration,
  ToolSelectionRef,
  ToolServerOperationHandler
} from "@refract/tool-contracts";
import type { Plugin } from "vite";

const TOOL_RUNTIME_PATH = "/@tool/runtime";
const RESOLVED_TOOL_RUNTIME_ID = "\0refract-tool-runtime";
const TOOL_ACTION_PATH = "/@tool/action";

const require = createRequire(import.meta.url);
const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

interface ResolvedActionRegistration {
  id: string;
  runtimeImport: {
    module: string;
    exportName: string;
  };
  serverOperations: Record<string, ToolServerOperationHandler>;
}

export interface ToolPluginOptions {
  runtimePath?: string;
  actions: ToolActionRegistration[];
  defaultActionId?: string;
}

export function toolPlugin(options: ToolPluginOptions): Plugin {
  const runtimePath = options.runtimePath ?? TOOL_RUNTIME_PATH;
  const runtimeClientEntry = toPosixPath(require.resolve("@refract/runtime-client"));
  const actions = resolveActionRegistrations(options.actions);

  const defaultActionId = options.defaultActionId ?? actions[0]?.id;
  if (defaultActionId && !actions.some((action) => action.id === defaultActionId)) {
    throw new Error(`toolPlugin defaultActionId '${defaultActionId}' is not present in registered actions.`);
  }

  let root = "";

  return {
    name: "refract-tool-plugin",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url ?? "").split("?")[0];
        if (request.method !== "POST" || pathname !== TOOL_ACTION_PATH) {
          next();
          return;
        }

        const payload = await readRequestBody(request);
        if (!payload) {
          respondJson(response, 400, {
            ok: false,
            code: "INVALID_PAYLOAD",
            message: "Expected a valid JSON object payload."
          });
          return;
        }

        const operationRequest = parseOperationRequest(payload);
        if (!operationRequest) {
          respondJson(response, 400, {
            ok: false,
            code: "INVALID_PAYLOAD",
            message: "Payload must include actionId, operation, selection, and input."
          });
          return;
        }

        const action = actions.find((candidate) => candidate.id === operationRequest.actionId);
        if (!action) {
          respondJson(response, 404, {
            ok: false,
            code: "ACTION_NOT_FOUND",
            message: `Unknown action '${operationRequest.actionId}'.`
          });
          return;
        }

        const operationHandler = action.serverOperations[operationRequest.operation];
        if (!operationHandler) {
          respondJson(response, 404, {
            ok: false,
            code: "OPERATION_NOT_FOUND",
            message: `Unknown operation '${operationRequest.operation}' for action '${operationRequest.actionId}'.`
          });
          return;
        }

        const absoluteFilePath = resolveSelectionFilePath(operationRequest.selection.file, root);
        if (!absoluteFilePath || !isWithinRoot(absoluteFilePath, root)) {
          respondJson(response, 403, {
            ok: false,
            code: "FORBIDDEN_PATH",
            message: "Requested file path is outside project root."
          });
          return;
        }

        try {
          const result = await operationHandler({
            actionId: operationRequest.actionId,
            operation: operationRequest.operation,
            selection: operationRequest.selection,
            input: operationRequest.input,
            projectRoot: root,
            absoluteFilePath
          });

          respondOperationResult(response, result);
        } catch {
          respondJson(response, 500, {
            ok: false,
            code: "OPERATION_HANDLER_ERROR",
            message: "Unhandled exception while executing action operation."
          });
        }
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: {
            type: "module",
            src: runtimePath
          },
          injectTo: "body"
        }
      ];
    },
    resolveId(id) {
      if (id === runtimePath) {
        return RESOLVED_TOOL_RUNTIME_ID;
      }

      return null;
    },
    load(id) {
      if (id !== RESOLVED_TOOL_RUNTIME_ID) {
        return null;
      }

      return buildRuntimeEntry({
        runtimeClientEntry,
        actions,
        defaultActionId
      });
    },
    transform(code, id) {
      const cleanId = id.split("?")[0];
      if (!isJsxLikeFile(cleanId) || cleanId.includes("/node_modules/")) {
        return null;
      }

      const ast = parse(code, {
        sourceType: "module",
        plugins: getParserPlugins(cleanId)
      });

      let didMutate = false;
      const file = normalizeSourceFile(cleanId, root);

      traverse(ast, {
        JSXOpeningElement(pathRef) {
          const { node } = pathRef;
          const start = node.loc?.start;
          if (!start) {
            return;
          }

          appendAttribute(node, "data-tool-file", file);
          appendAttribute(node, "data-tool-line", String(start.line));
          appendAttribute(node, "data-tool-column", String(start.column + 1));
          didMutate = true;
        }
      });

      if (!didMutate) {
        return null;
      }

      const output = generate(
        ast,
        {
          retainLines: true,
          sourceMaps: true
        },
        code
      );

      return {
        code: output.code,
        map: output.map ?? null
      };
    }
  };
}

function buildRuntimeEntry(args: {
  runtimeClientEntry: string;
  actions: ResolvedActionRegistration[];
  defaultActionId?: string;
}): string {
  const actionImports = args.actions
    .map((action, index) => {
      const actionImportName = `__toolAction${index}`;
      return `import { ${action.runtimeImport.exportName} as ${actionImportName} } from ${JSON.stringify(
        action.runtimeImport.module
      )};`;
    })
    .join("\n");

  const actionNames = args.actions.map((_, index) => `__toolAction${index}`).join(", ");
  const runtimeOptions = [
    `actions: [${actionNames}]`,
    ...(args.defaultActionId
      ? [`defaultActionId: ${JSON.stringify(args.defaultActionId)}`]
      : [])
  ].join(",\n    ");

  return `
import { initToolRuntime } from ${JSON.stringify(args.runtimeClientEntry)};
${actionImports}

if (!(window).__REFRACT_TOOL_RUNTIME_ENTRY__) {
  (window).__REFRACT_TOOL_RUNTIME_ENTRY__ = true;
  initToolRuntime({
    ${runtimeOptions}
  });
}
`;
}

function resolveActionRegistrations(actions: ToolActionRegistration[]): ResolvedActionRegistration[] {
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

    if (!action.runtimeImport?.module || !action.runtimeImport.exportName) {
      throw new Error(`toolPlugin action '${action.id}' is missing runtimeImport metadata.`);
    }

    const runtimeModule = resolveRuntimeImportModule(action.runtimeImport.module);

    return {
      id: action.id,
      runtimeImport: {
        module: runtimeModule,
        exportName: action.runtimeImport.exportName
      },
      serverOperations: action.serverOperations ?? {}
    };
  });
}

function resolveRuntimeImportModule(moduleValue: string): string {
  if (path.isAbsolute(moduleValue)) {
    return toPosixPath(moduleValue);
  }

  return toPosixPath(require.resolve(moduleValue));
}

function parseOperationRequest(value: Record<string, unknown>): ToolActionOperationRequest | null {
  const actionId = typeof value.actionId === "string" ? value.actionId : "";
  const operation = typeof value.operation === "string" ? value.operation : "";
  const selection = parseSelectionRef(value.selection);

  if (!actionId || !operation || !selection || !("input" in value)) {
    return null;
  }

  return {
    actionId,
    operation,
    selection,
    input: value.input
  };
}

function parseSelectionRef(value: unknown): ToolSelectionRef | null {
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

function respondOperationResult(
  response: ServerResponse,
  result: ToolActionOperationResult
): void {
  if (result.ok) {
    respondJson(response, 200, result);
    return;
  }

  respondJson(response, result.status ?? 400, result);
}

function respondJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request: IncomingMessage): Promise<Record<string, unknown> | null> {
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

function isJsxLikeFile(id: string): boolean {
  return /\.(jsx|tsx)$/.test(id);
}

function getParserPlugins(id: string): ("jsx" | "typescript")[] {
  if (id.endsWith(".tsx")) {
    return ["jsx", "typescript"];
  }

  return ["jsx"];
}

function normalizeSourceFile(id: string, root: string): string {
  const normalizedId = toPosixPath(id);
  const normalizedRoot = toPosixPath(root);

  if (normalizedId.startsWith(normalizedRoot)) {
    const relativePath = normalizedId.slice(normalizedRoot.length).replace(/^\//, "");
    return `/${relativePath}`;
  }

  return normalizedId;
}

function appendAttribute(node: t.JSXOpeningElement, name: string, value: string): void {
  const exists = node.attributes.some(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
  );

  if (exists) {
    return;
  }

  node.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(value)));
}

function toPosixPath(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

function getDefaultExport<T>(moduleValue: { default: T } | T): T {
  if (
    typeof moduleValue === "object" &&
    moduleValue !== null &&
    "default" in moduleValue
  ) {
    return moduleValue.default;
  }

  return moduleValue;
}

function isWithinRoot(candidatePath: string, root: string): boolean {
  const relative = path.relative(root, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? true
    : candidatePath === root;
}
