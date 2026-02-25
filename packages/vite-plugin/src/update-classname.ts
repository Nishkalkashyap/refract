import { promises as fs } from "node:fs";

import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";

const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

export interface ClassNameUpdateRequest {
  absoluteFilePath: string;
  line: number;
  column?: number;
  nextClassName: string;
}

export interface ClassNameUpdateErrorResult {
  ok: false;
  code:
    | "FILE_READ_ERROR"
    | "PARSE_ERROR"
    | "ELEMENT_NOT_FOUND"
    | "UNSUPPORTED_DYNAMIC_CLASSNAME"
    | "FILE_WRITE_ERROR";
  message: string;
  status: 400 | 404 | 409 | 500;
}

export interface ClassNameUpdateSuccessResult {
  ok: true;
}

export type ClassNameUpdateResult = ClassNameUpdateSuccessResult | ClassNameUpdateErrorResult;

export async function updateClassNameInFile(
  request: ClassNameUpdateRequest
): Promise<ClassNameUpdateResult> {
  const sourceCode = await readSourceFile(request.absoluteFilePath);
  if (!sourceCode.ok) {
    return sourceCode;
  }

  const parserPlugins = getParserPlugins(request.absoluteFilePath);

  let ast: t.File;
  try {
    ast = parse(sourceCode.value, {
      sourceType: "module",
      plugins: parserPlugins
    });
  } catch {
    return {
      ok: false,
      code: "PARSE_ERROR",
      message: "Unable to parse source file for className update.",
      status: 400
    };
  }

  const targetNode = findTargetOpeningElement(ast, request.line, request.column);
  if (!targetNode) {
    return {
      ok: false,
      code: "ELEMENT_NOT_FOUND",
      message: `Could not find JSX element at line ${request.line}${
        request.column ? `, column ${request.column}` : ""
      }.`,
      status: 409
    };
  }

  const classNameResult = upsertStaticClassName(targetNode, request.nextClassName);
  if (!classNameResult.ok) {
    return classNameResult;
  }

  const output = generate(
    ast,
    {
      retainLines: true,
      sourceMaps: false
    },
    sourceCode.value
  );

  try {
    await fs.writeFile(request.absoluteFilePath, output.code, "utf8");
  } catch {
    return {
      ok: false,
      code: "FILE_WRITE_ERROR",
      message: "Failed to write updated className to source file.",
      status: 500
    };
  }

  return { ok: true };
}

function findTargetOpeningElement(
  ast: t.File,
  line: number,
  column?: number
): t.JSXOpeningElement | null {
  let found: t.JSXOpeningElement | null = null;

  traverse(ast, {
    JSXOpeningElement(pathRef: NodePath<t.JSXOpeningElement>) {
      if (found) {
        return;
      }

      const start = pathRef.node.loc?.start;
      if (!start) {
        return;
      }

      if (start.line !== line) {
        return;
      }

      if (typeof column === "number" && start.column + 1 !== column) {
        return;
      }

      found = pathRef.node;
      pathRef.stop();
    }
  });

  return found;
}

function upsertStaticClassName(
  node: t.JSXOpeningElement,
  nextClassName: string
): ClassNameUpdateSuccessResult | ClassNameUpdateErrorResult {
  const existingClassName = node.attributes.find(
    (attribute): attribute is t.JSXAttribute =>
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === "className"
  );

  if (!existingClassName) {
    node.attributes.push(
      t.jsxAttribute(t.jsxIdentifier("className"), t.stringLiteral(nextClassName))
    );
    return { ok: true };
  }

  if (!existingClassName.value || existingClassName.value.type === "StringLiteral") {
    existingClassName.value = t.stringLiteral(nextClassName);
    return { ok: true };
  }

  return {
    ok: false,
    code: "UNSUPPORTED_DYNAMIC_CLASSNAME",
    message:
      "This element uses a dynamic className expression. v1 supports only static className strings.",
    status: 409
  };
}

async function readSourceFile(
  absoluteFilePath: string
): Promise<{ ok: true; value: string } | ClassNameUpdateErrorResult> {
  try {
    const value = await fs.readFile(absoluteFilePath, "utf8");
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      code: "FILE_READ_ERROR",
      message: "Failed to read source file for className update.",
      status: 404
    };
  }
}

function getParserPlugins(absoluteFilePath: string): ("jsx" | "typescript")[] {
  if (absoluteFilePath.endsWith(".tsx")) {
    return ["jsx", "typescript"];
  }

  return ["jsx"];
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
