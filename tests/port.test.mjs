import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { findFreePort } from "../server/port.mjs";

test("findFreePort returns valid port number", async () => {
  const port = await findFreePort();
  assert.equal(typeof port, "number");
  assert.ok(port > 1024, "should be unprivileged");
  assert.ok(port < 65536);
});

test("findFreePort returns different ports on consecutive calls", async () => {
  // Hold one port, ask for another, they should differ
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const held = server.address().port;
  const next = await findFreePort();
  assert.notEqual(next, held);
  server.close();
});

test("findFreePort returns immediately usable port", async () => {
  const port = await findFreePort();
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  server.close();
});
