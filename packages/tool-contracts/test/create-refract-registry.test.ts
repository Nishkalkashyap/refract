import assert from "node:assert/strict";
import test from "node:test";

import type { RefractRuntimePlugin, RefractServerPlugin } from "../src/index.ts";
import { createRefractRegistry } from "../src/index.ts";

interface InvokePayload {
  kind: "run";
}

const runtimePlugin: RefractRuntimePlugin<InvokePayload> = {
  id: "example",
  label: "Example",
  inBrowserHandler() {}
};

const serverPlugin: RefractServerPlugin<InvokePayload> = {
  id: "example",
  serverHandler() {
    return { ok: true };
  }
};

test("createRefractRegistry returns runtime and server plugins", () => {
  const registry = createRefractRegistry({
    plugins: [
      {
        runtime: runtimePlugin,
        server: serverPlugin
      }
    ]
  });

  assert.equal(registry.runtimePlugins.length, 1);
  assert.equal(registry.serverPlugins.length, 1);
  assert.equal(registry.defaultPluginId, "example");
});

test("createRefractRegistry rejects duplicated runtime ids", () => {
  assert.throws(
    () =>
      createRefractRegistry({
        plugins: [
          { runtime: runtimePlugin },
          {
            runtime: {
              ...runtimePlugin
            }
          }
        ]
      }),
    /duplicated/i
  );
});

test("createRefractRegistry rejects mismatched server ids", () => {
  assert.throws(
    () =>
      createRefractRegistry({
        plugins: [
          {
            runtime: runtimePlugin,
            server: {
              ...serverPlugin,
              id: "different-id"
            }
          }
        ]
      }),
    /must match runtime plugin id/i
  );
});

test("createRefractRegistry rejects invalid defaultPluginId", () => {
  assert.throws(
    () =>
      createRefractRegistry({
        plugins: [{ runtime: runtimePlugin }],
        defaultPluginId: "missing"
      }),
    /defaultPluginId/i
  );
});
