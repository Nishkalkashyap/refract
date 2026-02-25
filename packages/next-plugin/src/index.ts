import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const DEFAULT_TRANSPILE_PACKAGES = [
  "@nkstack/refract-tool-contracts",
  "@nkstack/refract-runtime-client",
  "@nkstack/refract-tailwind-editor-action"
];

const INSTRUMENTED_GLOBS = ["*.js", "*.jsx", "*.ts", "*.tsx"];

export interface RefractNextPluginOptions {
  enabled?: boolean;
  transpilePackages?: string[];
}

export function withRefract(options: RefractNextPluginOptions = {}) {
  const enabled = options.enabled ?? process.env.NODE_ENV === "development";

  return (nextConfig: NextConfig = {}): NextConfig => {
    if (!enabled) {
      return nextConfig;
    }

    const loaderPath = fileURLToPath(
      new URL("./jsx-instrumentation-loader.cjs", import.meta.url)
    );

    const existingTranspilePackages = nextConfig.transpilePackages ?? [];
    const extraTranspilePackages = options.transpilePackages ?? [];
    const transpilePackages = Array.from(
      new Set([
        ...existingTranspilePackages,
        ...DEFAULT_TRANSPILE_PACKAGES,
        ...extraTranspilePackages
      ])
    );

    const turbopack = nextConfig.turbopack ?? {};
    const existingRules = (turbopack.rules ?? {}) as Record<string, unknown>;
    const nextRules: Record<string, unknown> = { ...existingRules };

    for (const glob of INSTRUMENTED_GLOBS) {
      nextRules[glob] = mergeRule(nextRules[glob], loaderPath);
    }

    return {
      ...nextConfig,
      transpilePackages,
      turbopack: {
        ...turbopack,
        rules: nextRules as NonNullable<NextConfig["turbopack"]>["rules"]
      }
    };
  };
}

export { createRefractRouteHandler } from "./server";
export type { CreateRefractRouteHandlerOptions } from "./server";

function mergeRule(existingRule: unknown, loaderPath: string): unknown {
  if (!existingRule) {
    return { loaders: [loaderPath] };
  }

  if (Array.isArray(existingRule)) {
    return existingRule.map((rule) => mergeRule(rule, loaderPath));
  }

  if (typeof existingRule !== "object") {
    return { loaders: [loaderPath] };
  }

  const candidateRule = existingRule as { loaders?: string[] | unknown[] };
  const loaders = Array.isArray(candidateRule.loaders) ? candidateRule.loaders : [];
  if (loaders.includes(loaderPath)) {
    return existingRule;
  }

  return {
    ...candidateRule,
    loaders: [loaderPath, ...loaders]
  };
}
