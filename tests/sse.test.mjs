import { test } from "node:test";
import assert from "node:assert/strict";
import { createSseHub } from "../server/sse.mjs";

class FakeResponse {
  constructor() {
    this.headers = null;
    this.chunks = [];
    this.ended = false;
    this.listeners = {};
  }
  writeHead(code, headers) {
    this.code = code;
    this.headers = headers;
  }
  write(chunk) {
    if (this.ended) throw new Error("write after end");
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.ended = true;
    (this.listeners.close ?? []).forEach((fn) => fn());
  }
  on(event, fn) {
    (this.listeners[event] ??= []).push(fn);
  }
}

test("addClient writes SSE headers and welcome event", () => {
  const hub = createSseHub();
  const res = new FakeResponse();
  hub.addClient(res);
  assert.equal(res.code, 200);
  assert.equal(res.headers["Content-Type"], "text/event-stream");
  assert.equal(res.headers["Cache-Control"], "no-cache");
  assert.equal(res.headers["Connection"], "keep-alive");
  assert.ok(res.chunks.some((c) => c.includes("event: hello")));
});

test("broadcast sends event to all clients", () => {
  const hub = createSseHub();
  const a = new FakeResponse();
  const b = new FakeResponse();
  hub.addClient(a);
  hub.addClient(b);
  a.chunks.length = 0;
  b.chunks.length = 0;
  hub.broadcast("diagram:update", { id: "x" });
  assert.ok(a.chunks.some((c) => c.includes("event: diagram:update")));
  assert.ok(a.chunks.some((c) => c.includes('"id":"x"')));
  assert.ok(b.chunks.some((c) => c.includes("event: diagram:update")));
});

test("client count reflects connect + disconnect", () => {
  const hub = createSseHub();
  assert.equal(hub.clientCount(), 0);
  const a = new FakeResponse();
  const b = new FakeResponse();
  hub.addClient(a);
  hub.addClient(b);
  assert.equal(hub.clientCount(), 2);
  a.end();
  assert.equal(hub.clientCount(), 1);
  b.end();
  assert.equal(hub.clientCount(), 0);
});

test("lastClientTs updates on connect/disconnect", () => {
  const hub = createSseHub();
  const t0 = hub.lastClientTs();
  const res = new FakeResponse();
  hub.addClient(res);
  assert.ok(hub.lastClientTs() >= t0);
  const t1 = hub.lastClientTs();
  res.end();
  assert.ok(hub.lastClientTs() >= t1);
});

test("broadcast skips ended clients", () => {
  const hub = createSseHub();
  const a = new FakeResponse();
  hub.addClient(a);
  a.end();
  hub.broadcast("test", { x: 1 });
  // Should not throw; nothing to assert beyond no-error
  assert.ok(true);
});
