import { withRefractServerHandler, type RefractPlugin } from "@nkstack/refract-tool-contracts";

import runtimePlugin from "./runtime.ts";
import { tailwindEditorServerHandler } from "./server.ts";
import type { TailwindEditorInvokePayload } from "./types";

export const tailwindEditorPlugin: RefractPlugin<TailwindEditorInvokePayload> =
  withRefractServerHandler(runtimePlugin, tailwindEditorServerHandler);
