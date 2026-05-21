import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readLock,
  writeLock,
  removeLock,
  isPidAlive,
  claimLock,
} from "../server/lockfile.mjs";

async function freshDir() {
  return await mkdtemp(join(tmpdir(), "cc-lock-"));
}

test("readLock returns null when missing", async () => {
  const dir = await freshDir();
  const result = await readLock(join(dir, "server.lock"));
  assert.equal(result, null);
  await rm(dir, { recursive: true });
});

test("writeLock then readLock returns same data", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  await writeLock(path, { pid: 1234, port: 5555 });
  const result = await readLock(path);
  assert.equal(result.pid, 1234);
  assert.equal(result.port, 5555);
  assert.ok(result.started_at);
  await rm(dir, { recursive: true });
});

test("removeLock deletes file", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  await writeLock(path, { pid: 1, port: 1 });
  await removeLock(path);
  const result = await readLock(path);
  assert.equal(result, null);
  await rm(dir, { recursive: true });
});

test("isPidAlive returns true for current process", () => {
  assert.equal(isPidAlive(process.pid), true);
});

test("isPidAlive returns false for impossible pid", () => {
  assert.equal(isPidAlive(0), false);
  assert.equal(isPidAlive(999999999), false);
});

test("claimLock returns existing when alive", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  await writeLock(path, { pid: process.pid, port: 9999 });
  const result = await claimLock(path, () => 1234);
  assert.equal(result.reused, true);
  assert.equal(result.port, 9999);
  await rm(dir, { recursive: true });
});

test("claimLock claims when stale (pid dead)", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  await writeLock(path, { pid: 999999998, port: 9999 });
  const result = await claimLock(path, () => 7777);
  assert.equal(result.reused, false);
  assert.equal(result.port, 7777);
  const written = await readLock(path);
  assert.equal(written.pid, process.pid);
  assert.equal(written.port, 7777);
  await rm(dir, { recursive: true });
});

test("claimLock claims when missing", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  const result = await claimLock(path, () => 7777);
  assert.equal(result.reused, false);
  assert.equal(result.port, 7777);
  await rm(dir, { recursive: true });
});

test("readLock returns null on corrupted file", async () => {
  const dir = await freshDir();
  const path = join(dir, "server.lock");
  await writeFile(path, "not json {{{", "utf8");
  const result = await readLock(path);
  assert.equal(result, null);
  await rm(dir, { recursive: true });
});
