import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { RefractServerPlugin } from "@nkstack/refract-tool-contracts";
import { NextRequest } from "next/server";

import { createRefractRouteHandler } from "../src/server.ts";

interface InvokePayload {
  kind: "noop";
}

async function createFixtureProject() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "refract-next-plugin-test-"));
  const sourceDir = path.join(projectRoot, "src");
  const sourcePath = path.join(sourceDir, "Example.tsx");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(sourcePath, 'export function Example() { return <div className="foo" />; }\n');

  return { projectRoot, sourcePath };
}

test("createRefractRouteHandler returns 400 for invalid payload", async () => {
  const { projectRoot } = await createFixtureProject();

  try {
    const plugin: RefractServerPlugin<InvokePayload> = {
      id: "example",
      serverHandler: async () => ({ ok: true })
    };
    const handler = createRefractRouteHandler({
      serverPlugins: [plugin],
      projectRoot,
      enabled: true
    });

    const request = new NextRequest("http://localhost/api/refract/plugin", {
      method: "POST",
      body: JSON.stringify({})
    });
    const response = await handler(request);

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.ok, false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("createRefractRouteHandler returns 403 for selection paths outside root", async () => {
  const { projectRoot } = await createFixtureProject();

  try {
    const plugin: RefractServerPlugin<InvokePayload> = {
      id: "example",
      serverHandler: async () => ({ ok: true })
    };
    const handler = createRefractRouteHandler({
      serverPlugins: [plugin],
      projectRoot,
      enabled: true
    });

    const request = new NextRequest("http://localhost/api/refract/plugin", {
      method: "POST",
      body: JSON.stringify({
        pluginId: "example",
        selectionRef: {
          file: "/../outside.tsx",
          line: 1,
          tagName: "div"
        },
        payload: {
          kind: "noop"
        }
      })
    });
    const response = await handler(request);

    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.ok, false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("createRefractRouteHandler invokes matching plugin server handler", async () => {
  const { projectRoot } = await createFixtureProject();

  try {
    let invocationCount = 0;

    const plugin: RefractServerPlugin<InvokePayload> = {
      id: "example",
      serverHandler: async ({ selectionRef, file, payload }) => {
        invocationCount += 1;

        assert.equal(selectionRef.file, "/src/Example.tsx");
        assert.equal(file.absolutePath.endsWith(path.join("src", "Example.tsx")), true);
        assert.equal(payload.kind, "noop");

        return { ok: true, data: { updated: true } };
      }
    };
    const handler = createRefractRouteHandler({
      serverPlugins: [plugin],
      projectRoot,
      enabled: true
    });

    const request = new NextRequest("http://localhost/api/refract/plugin", {
      method: "POST",
      body: JSON.stringify({
        pluginId: "example",
        selectionRef: {
          file: "/src/Example.tsx",
          line: 1,
          column: 10,
          tagName: "div"
        },
        payload: {
          kind: "noop"
        }
      })
    });
    const response = await handler(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(invocationCount, 1);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
