import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  ToolActionOperationRequest,
  ToolActionOperationResult,
  ToolSelectionRef,
  ToolServerOperationHandler
} from "@refract/tool-contracts";

const TOOL_ACTION_PATH = "/@tool/action";

interface ActionBridgeAction {
  id: string;
  serverOperations: Record<string, ToolServerOperationHandler>;
}

interface CreateActionBridgeMiddlewareOptions {
  actions: ActionBridgeAction[];
  getProjectRoot: () => string;
}

export function createActionBridgeMiddleware(options: CreateActionBridgeMiddlewareOptions) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) => {
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

    const action = options.actions.find(
      (candidate) => candidate.id === operationRequest.actionId
    );
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

    const projectRoot = options.getProjectRoot();
    const absoluteFilePath = resolveSelectionFilePath(
      operationRequest.selection.file,
      projectRoot
    );
    if (!absoluteFilePath || !isWithinRoot(absoluteFilePath, projectRoot)) {
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
        projectRoot,
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
  };
}

function parseOperationRequest(
  value: Record<string, unknown>
): ToolActionOperationRequest | null {
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
      } catch {
        resolve(null);
        return;
      }

      resolve(null);
    });

    request.on("error", () => resolve(null));
  });
}

function isWithinRoot(candidatePath: string, root: string): boolean {
  const relative = path.relative(root, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? true
    : candidatePath === root;
}
