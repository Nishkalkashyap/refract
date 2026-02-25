import path from "node:path";
import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse } from "node:http";

import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import type { Plugin } from "vite";

import { updateClassNameInFile } from "./update-classname.ts";

const TOOL_RUNTIME_PATH = "/@tool/runtime";
const RESOLVED_TOOL_RUNTIME_ID = "\0refract-tool-runtime";
const UPDATE_CLASSNAME_PATH = "/@tool/update-classname";
const require = createRequire(import.meta.url);
const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

export interface ToolPluginOptions {
  runtimePath?: string;
}

export function toolPlugin(options: ToolPluginOptions = {}): Plugin {
  const runtimePath = options.runtimePath ?? TOOL_RUNTIME_PATH;
  const runtimeClientEntry = toPosixPath(require.resolve("@refract/runtime-client"));
  const dummyActionEntry = toPosixPath(require.resolve("@refract/dummy-action"));
  const tailwindEditorActionEntry = toPosixPath(require.resolve("@refract/tailwind-editor-action"));
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
        if (request.method !== "POST" || pathname !== UPDATE_CLASSNAME_PATH) {
          next();
          return;
        }

        const payload = await readRequestBody(request);
        if (!payload) {
          respondJson(response, 400, {
            ok: false,
            code: "INVALID_PAYLOAD",
            message: "Expected JSON payload."
          });
          return;
        }

        const file = typeof payload.file === "string" ? payload.file : "";
        const line = Number(payload.line);
        const column =
          typeof payload.column === "number" ? payload.column : Number(payload.column);
        const nextClassName =
          typeof payload.nextClassName === "string" ? payload.nextClassName : null;

        if (
          !file ||
          !Number.isInteger(line) ||
          line < 1 ||
          (Number.isFinite(column) && (!Number.isInteger(column) || column < 1)) ||
          nextClassName === null
        ) {
          respondJson(response, 400, {
            ok: false,
            code: "INVALID_PAYLOAD",
            message: "Payload must include file, line, and nextClassName."
          });
          return;
        }

        const candidatePath = resolveRequestFilePath(file, root);
        if (!candidatePath || !isWithinRoot(candidatePath, root)) {
          respondJson(response, 403, {
            ok: false,
            code: "FORBIDDEN_PATH",
            message: "Requested file path is not within the project root."
          });
          return;
        }

        if (!/\.(tsx|jsx)$/.test(candidatePath)) {
          respondJson(response, 400, {
            ok: false,
            code: "UNSUPPORTED_FILE",
            message: "Only JSX/TSX files are supported."
          });
          return;
        }

        const updateResult = await updateClassNameInFile({
          absoluteFilePath: candidatePath,
          line,
          ...(Number.isFinite(column) ? { column } : {}),
          nextClassName
        });

        if (!updateResult.ok) {
          respondJson(response, updateResult.status, updateResult);
          return;
        }

        respondJson(response, 200, { ok: true });
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

      return `
import { initToolRuntime } from "${runtimeClientEntry}";
import { dummyAction } from "${dummyActionEntry}";
import { tailwindEditorAction } from "${tailwindEditorActionEntry}";

if (!(window).__REFRACT_TOOL_RUNTIME_ENTRY__) {
  (window).__REFRACT_TOOL_RUNTIME_ENTRY__ = true;
  initToolRuntime({
    actions: [tailwindEditorAction, dummyAction],
    defaultActionId: tailwindEditorAction.id
  });
}
`;
    },
    transform(code, id) {
      const cleanId = id.split("?")[0];
      if (!isJsxLikeFile(cleanId)) {
        return null;
      }

      if (cleanId.includes("/node_modules/")) {
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

function resolveRequestFilePath(file: string, root: string): string | null {
  const normalizedFile = file.replace(/\\/g, "/");
  const relativeFile = normalizedFile.startsWith("/")
    ? normalizedFile.slice(1)
    : normalizedFile;
  if (!relativeFile) {
    return null;
  }

  return path.resolve(root, relativeFile);
}

function isWithinRoot(candidatePath: string, root: string): boolean {
  const relative = path.relative(root, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? true
    : candidatePath === root;
}

function respondJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readRequestBody(
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

        resolve(null);
      } catch {
        resolve(null);
      }
    });
    request.on("error", () => resolve(null));
  });
}
