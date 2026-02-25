import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";

const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

interface TransformJsxForToolMetadataOptions {
  code: string;
  id: string;
  root: string;
}

export function transformJsxForToolMetadata(
  options: TransformJsxForToolMetadataOptions
) {
  const cleanId = options.id.split("?")[0];
  if (!isJsxLikeFile(cleanId) || cleanId.includes("/node_modules/")) {
    return;
  }

  const ast = parse(options.code, {
    sourceType: "module",
    plugins: getParserPlugins(cleanId)
  });

  let didMutate = false;
  const file = normalizeSourceFile(cleanId, options.root);

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
    return;
  }

  const output = generate(
    ast,
    {
      retainLines: true,
      sourceMaps: true
    },
    options.code
  );

  return {
    code: output.code,
    map: output.map ?? null
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
