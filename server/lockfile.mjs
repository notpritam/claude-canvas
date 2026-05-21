import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function readLock(path) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeLock(path, { pid, port }) {
  await mkdir(dirname(path), { recursive: true });
  const data = {
    pid,
    port,
    started_at: new Date().toISOString(),
    last_client_ts: Date.now(),
  };
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return data;
}

export async function removeLock(path) {
  try {
    await unlink(path);
  } catch {
    // already gone
  }
}

export function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}

export async function claimLock(path, allocatePort) {
  const existing = await readLock(path);
  if (existing && isPidAlive(existing.pid)) {
    return { reused: true, port: existing.port, pid: existing.pid };
  }
  if (existing) await removeLock(path);
  const port = allocatePort();
  await writeLock(path, { pid: process.pid, port });
  return { reused: false, port, pid: process.pid };
}
