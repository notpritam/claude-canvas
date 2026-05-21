import { readFile } from "node:fs/promises";
import { join, normalize, sep, extname } from "node:path";
import { saveDiagram, loadDiagram, listDiagrams, saveTemplate, listTemplates } from "./storage.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function sendText(res, status, text, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type });
  res.end(text);
}

async function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeAssetPath(root, urlPath) {
  // urlPath like "/assets/foo.js"
  const decoded = decodeURIComponent(urlPath);
  const rel = decoded.replace(/^\/+/, "");
  const absRoot = join(root, "app", "dist");
  const abs = normalize(join(absRoot, rel));
  if (!abs.startsWith(absRoot + sep) && abs !== absRoot) return null;
  return abs;
}

async function serveStatic(req, res, root) {
  const url = req.url.split("?")[0];
  let target;
  if (url === "/" || url === "/index.html") {
    target = join(root, "app", "dist", "index.html");
  } else {
    target = safeAssetPath(root, url);
    if (!target) return sendText(res, 400, "bad path");
  }
  try {
    const data = await readFile(target);
    const type = MIME[extname(target)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Content-Length": data.length });
    res.end(data);
  } catch {
    return null;
  }
  return true;
}

export function createRouter({ root, hub }) {
  return async function handler(req, res) {
    try {
      const url = req.url.split("?")[0];

      if (req.method === "GET" && url === "/api/diagrams") {
        const list = await listDiagrams(root);
        return sendJson(res, 200, list);
      }

      if (req.method === "GET" && url.startsWith("/api/diagrams/")) {
        const id = url.slice("/api/diagrams/".length);
        if (!id || id.includes("/")) return sendJson(res, 400, { error: "bad id" });
        const d = await loadDiagram(root, id);
        if (!d) return sendJson(res, 404, { error: "not found" });
        return sendJson(res, 200, d);
      }

      if (req.method === "POST" && url === "/api/save") {
        const raw = await readBody(req);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid JSON" });
        }
        try {
          const saved = await saveDiagram(root, parsed);
          hub.broadcast("diagram:update", { id: saved.id });
          return sendJson(res, 200, { ok: true, diagram: saved });
        } catch (err) {
          return sendJson(res, 400, { error: err.message, errors: err.message.split("; ") });
        }
      }

      if (req.method === "GET" && url === "/api/templates") {
        const list = await listTemplates(root);
        return sendJson(res, 200, list);
      }

      if (req.method === "POST" && url === "/api/templates") {
        const raw = await readBody(req);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid JSON" });
        }
        try {
          const t = await saveTemplate(root, parsed);
          return sendJson(res, 200, t);
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      if (req.method === "GET" && url === "/api/events") {
        hub.addClient(res);
        return;
      }

      if (req.method === "GET") {
        const ok = await serveStatic(req, res, root);
        if (ok) return;
        return sendJson(res, 404, { error: "not found" });
      }

      return sendJson(res, 405, { error: "method not allowed" });
    } catch (err) {
      console.error("router error:", err);
      if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    }
  };
}
