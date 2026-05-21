import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createHttp } from "node:http";
import { createRouter } from "../server/routes.mjs";
import { createSseHub } from "../server/sse.mjs";

async function freshRoot() {
  const root = await mkdtemp(join(tmpdir(), "cc-routes-"));
  await mkdir(join(root, "data", "diagrams"), { recursive: true });
  await mkdir(join(root, "data", "templates"), { recursive: true });
  await mkdir(join(root, "templates", "defaults"), { recursive: true });
  await mkdir(join(root, "app", "dist"), { recursive: true });
  await mkdir(join(root, "app", "dist", "assets"), { recursive: true });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(root, "app", "dist", "index.html"), "<html>app</html>");
  await writeFile(join(root, "app", "dist", "assets", "x.js"), "console.log('x');");
  return root;
}

async function withServer(root, fn) {
  const hub = createSseHub();
  const router = createRouter({ root, hub });
  const server = createHttp(router);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  try {
    await fn({ port, hub });
  } finally {
    server.close();
  }
}

const sample = {
  id: "sample",
  title: "Sample",
  schema_version: 1,
  nodes: [],
  edges: [],
};

test("GET / serves index.html", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("app"));
  });
  await rm(root, { recursive: true });
});

test("GET /assets/x.js serves asset", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/assets/x.js`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("console.log"));
  });
  await rm(root, { recursive: true });
});

test("GET /assets/../etc/passwd is rejected (path traversal)", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/assets/..%2F..%2F..%2Fetc%2Fpasswd`);
    assert.ok(res.status === 400 || res.status === 404);
  });
  await rm(root, { recursive: true });
});

test("GET /api/diagrams returns empty array initially", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/diagrams`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.deepEqual(list, []);
  });
  await rm(root, { recursive: true });
});

test("POST /api/save then GET /api/diagrams/:id round-trips", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const saveRes = await fetch(`http://127.0.0.1:${port}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });
    assert.equal(saveRes.status, 200);
    const getRes = await fetch(`http://127.0.0.1:${port}/api/diagrams/sample`);
    assert.equal(getRes.status, 200);
    const d = await getRes.json();
    assert.equal(d.id, "sample");
  });
  await rm(root, { recursive: true });
});

test("POST /api/save with invalid diagram returns 400", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "bad" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors);
  });
  await rm(root, { recursive: true });
});

test("POST /api/save broadcasts diagram:update via SSE hub", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port, hub }) => {
    const events = [];
    const fakeRes = {
      writeHead() {},
      write(chunk) {
        events.push(chunk);
      },
      end() {},
      on() {},
    };
    hub.addClient(fakeRes);
    events.length = 0;
    await fetch(`http://127.0.0.1:${port}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });
    assert.ok(events.some((e) => e.includes("diagram:update")));
  });
  await rm(root, { recursive: true });
});

test("GET /api/templates returns empty when no defaults or user templates", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/templates`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.deepEqual(list, []);
  });
  await rm(root, { recursive: true });
});

test("POST /api/templates saves a template", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "tpl-1",
        name: "Template 1",
        description: "test",
        tags: ["x"],
        diagram: sample,
      }),
    });
    assert.equal(res.status, 200);
    const listRes = await fetch(`http://127.0.0.1:${port}/api/templates`);
    const list = await listRes.json();
    assert.ok(list.find((t) => t.slug === "tpl-1"));
  });
  await rm(root, { recursive: true });
});

test("GET /unknown returns 404", async () => {
  const root = await freshRoot();
  await withServer(root, async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/nonsense`);
    assert.equal(res.status, 404);
  });
  await rm(root, { recursive: true });
});
