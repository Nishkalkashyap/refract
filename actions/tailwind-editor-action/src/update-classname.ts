import { promises as fs } from "node:fs";

import generateModule from "@babel/generator";
import { parse } from "@babel/parser";
import traverseModule, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { ToolActionOperationResult } from "@refract/tool-contracts";

const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

interface UpdateClassNameRequest {
  absoluteFilePath: string;
  line: number;
  column?: number;
  nextClassName: string;
}

type OperationFailure = Extract<ToolActionOperationResult, { ok: false }>;

export class ClassNameFileUpdater {
  async update(request: UpdateClassNameRequest): Promise<ToolActionOperationResult> {
    const source = await this.readSourceFile(request.absoluteFilePath);
    if (!source.ok) {
      return source;
    }

    let ast: t.File;
    try {
      ast = parse(source.value, {
        sourceType: "module",
        plugins: this.getParserPlugins(request.absoluteFilePath)
      });
    } catch {
      return {
        ok: false,
        code: "PARSE_ERROR",
        message: "Unable to parse source file for className update.",
        status: 400
      };
    }

    const targetNode = this.findTargetOpeningElement(ast, request.line, request.column);
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

    const updateResult = this.upsertClassName(targetNode, request.nextClassName);
    if (!updateResult.ok) {
      return updateResult;
    }

    const output = generate(
      ast,
      {
        retainLines: true,
        sourceMaps: false
      },
      source.value
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

  private findTargetOpeningElement(
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
        if (!start || start.line !== line) {
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

  private upsertClassName(
    node: t.JSXOpeningElement,
    nextClassName: string
  ): ToolActionOperationResult {
    const classNameAttribute = node.attributes.find(
      (attribute): attribute is t.JSXAttribute =>
        attribute.type === "JSXAttribute" &&
        attribute.name.type === "JSXIdentifier" &&
        attribute.name.name === "className"
    );

    if (!classNameAttribute) {
      node.attributes.push(
        t.jsxAttribute(t.jsxIdentifier("className"), t.stringLiteral(nextClassName))
      );
      return { ok: true };
    }

    if (!classNameAttribute.value || classNameAttribute.value.type === "StringLiteral") {
      classNameAttribute.value = t.stringLiteral(nextClassName);
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

  private async readSourceFile(
    absoluteFilePath: string
  ): Promise<{ ok: true; value: string } | OperationFailure> {
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

  private getParserPlugins(absoluteFilePath: string): ("jsx" | "typescript")[] {
    if (absoluteFilePath.endsWith(".tsx")) {
      return ["jsx", "typescript"];
    }

    return ["jsx"];
  }
}

export async function updateClassNameInFile(
  request: UpdateClassNameRequest
): Promise<ToolActionOperationResult> {
  return new ClassNameFileUpdater().update(request);
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
