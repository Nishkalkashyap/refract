import { createRequire } from "node:module";

import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import type { Plugin } from "vite";

const TOOL_RUNTIME_PATH = "/@tool/runtime";
const RESOLVED_TOOL_RUNTIME_ID = "\0refract-tool-runtime";
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
  let root = "";

  return {
    name: "refract-tool-plugin",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
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

if (!(window).__REFRACT_TOOL_RUNTIME_ENTRY__) {
  (window).__REFRACT_TOOL_RUNTIME_ENTRY__ = true;
  initToolRuntime({ actions: [dummyAction], defaultActionId: dummyAction.id });
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
