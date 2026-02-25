import { createRefractRouteHandler } from "@nkstack/refract-next-plugin/server";
import { tailwindEditorServerPlugin } from "@nkstack/refract-tailwind-editor-action/server";

export const runtime = "nodejs";

export const POST = createRefractRouteHandler({
  serverPlugins: [tailwindEditorServerPlugin]
});
