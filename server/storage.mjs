import { readFile, writeFile, readdir, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { validateDiagram } from "./schema.mjs";

function diagramPath(root, id) {
  return join(root, "data", "diagrams", `${id}.json`);
}

function templateUserPath(root, slug) {
  return join(root, "data", "templates", `${slug}.json`);
}

function templateUserIndexPath(root) {
  return join(root, "data", "templates", "index.json");
}

function templateDefaultIndexPath(root) {
  return join(root, "templates", "defaults", "index.json");
}

async function readJsonSafe(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function writeJsonAtomic(path, data) {
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, path);
}

export async function saveDiagram(root, diagram) {
  const check = validateDiagram(diagram);
  if (!check.ok) {
    throw new Error(`invalid diagram: ${check.errors.join("; ")}`);
  }
  const path = diagramPath(root, diagram.id);
  const existing = await readJsonSafe(path);
  const now = new Date().toISOString();
  const merged = {
    ...diagram,
    created_at: existing?.created_at ?? diagram.created_at ?? now,
    updated_at: now,
  };
  await writeJsonAtomic(path, merged);
  return merged;
}

export async function loadDiagram(root, id) {
  return readJsonSafe(diagramPath(root, id));
}

export async function listDiagrams(root) {
  const dir = join(root, "data", "diagrams");
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const previews = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const d = await readJsonSafe(join(dir, entry));
    if (!d) continue;
    previews.push({
      id: d.id,
      title: d.title,
      description: d.description,
      updated_at: d.updated_at,
      template_id: d.template_id,
    });
  }
  return previews.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}

export async function saveTemplate(root, { slug, name, description, tags, diagram }) {
  const check = validateDiagram(diagram);
  if (!check.ok) {
    throw new Error(`invalid template diagram: ${check.errors.join("; ")}`);
  }
  await writeJsonAtomic(templateUserPath(root, slug), { slug, name, description, tags, diagram });
  const index = (await readJsonSafe(templateUserIndexPath(root))) ?? { templates: [] };
  index.templates = index.templates.filter((t) => t.slug !== slug);
  index.templates.push({
    slug,
    name,
    description,
    tags,
    created_at: new Date().toISOString(),
  });
  await writeJsonAtomic(templateUserIndexPath(root), index);
  return { slug, name, description, tags };
}

export async function listTemplates(root) {
  const out = [];
  const defaults = await readJsonSafe(templateDefaultIndexPath(root));
  if (defaults?.templates) {
    for (const t of defaults.templates) out.push({ ...t, source: "default" });
  }
  const user = await readJsonSafe(templateUserIndexPath(root));
  if (user?.templates) {
    for (const t of user.templates) out.push({ ...t, source: "user" });
  }
  return out;
}

export async function loadTemplate(root, slug, source = "user") {
  if (source === "default") {
    return readJsonSafe(join(root, "templates", "defaults", `${slug}.json`));
  }
  return readJsonSafe(templateUserPath(root, slug));
}
