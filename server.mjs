#!/usr/bin/env node
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findFreePort } from "./server/port.mjs";
import { claimLock, writeLock, removeLock, readLock } from "./server/lockfile.mjs";
import { createSseHub } from "./server/sse.mjs";
import { createRouter } from "./server/routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const LOCK_PATH = join(ROOT, "data", "server.lock");
const IDLE_EXIT_MS = 30 * 60 * 1000; // 30 min
const IDLE_CHECK_MS = 60 * 1000;

async function startServer() {
  const port = await findFreePort();
  const claim = await claimLock(LOCK_PATH, () => port);

  if (claim.reused) {
    console.log(JSON.stringify({ status: "reused", port: claim.port, pid: claim.pid }));
    process.exit(0);
  }

  const hub = createSseHub();
  const handler = createRouter({ root: ROOT, hub });
  const server = createServer(handler);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(claim.port, "127.0.0.1", resolve);
  });

  console.log(JSON.stringify({ status: "started", port: claim.port, pid: process.pid }));

  const idleTimer = setInterval(async () => {
    const idleFor = Date.now() - hub.lastClientTs();
    if (hub.clientCount() === 0 && idleFor > IDLE_EXIT_MS) {
      console.log(JSON.stringify({ status: "idle-exit", idleFor }));
      await shutdown(0);
    }
  }, IDLE_CHECK_MS);
  idleTimer.unref();

  async function shutdown(code) {
    clearInterval(idleTimer);
    await removeLock(LOCK_PATH);
    server.close(() => process.exit(code));
    setTimeout(() => process.exit(code), 2000).unref();
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

startServer().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err.message }));
  process.exit(1);
});
