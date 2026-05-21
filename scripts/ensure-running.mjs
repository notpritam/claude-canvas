#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { readLock, isPidAlive } from "../server/lockfile.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCK_PATH = join(ROOT, "data", "server.lock");
const SERVER_PATH = join(ROOT, "server.mjs");

function parseArgs(argv) {
  const args = { open: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--open") args.open = argv[++i];
    else if (argv[i] === "--quiet") args.quiet = true;
  }
  return args;
}

async function isRunning() {
  const lock = await readLock(LOCK_PATH);
  if (!lock || !isPidAlive(lock.pid)) return null;
  return lock;
}

async function spawnDetached() {
  const out = spawn("node", [SERVER_PATH], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: ROOT,
  });
  out.unref();
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk) => {
      buf += chunk.toString();
      const line = buf.split("\n").find((l) => l.trim().startsWith("{"));
      if (line) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.status === "started" || parsed.status === "reused") {
            out.stdout.off("data", onData);
            resolve(parsed);
          } else if (parsed.status === "error") {
            out.stdout.off("data", onData);
            reject(new Error(parsed.message));
          }
        } catch {}
      }
    };
    out.stdout.on("data", onData);
    out.stderr.on("data", (c) => process.stderr.write(c));
    setTimeout(() => reject(new Error("server start timeout")), 10000).unref();
  });
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  const child = spawn(cmd, [url], { detached: true, stdio: "ignore" });
  child.unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let lock = await isRunning();
  let wasNew = false;
  if (!lock) {
    const started = await spawnDetached();
    // brief wait for listen socket
    await wait(150);
    lock = { pid: started.pid, port: started.port };
    wasNew = true;
  }

  const url = args.open
    ? `http://127.0.0.1:${lock.port}/#/${encodeURIComponent(args.open)}`
    : `http://127.0.0.1:${lock.port}/`;

  if (wasNew) openBrowser(url);

  if (!args.quiet) {
    console.log(JSON.stringify({ url, port: lock.port, pid: lock.pid, new: wasNew }));
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err.message }));
  process.exit(1);
});
