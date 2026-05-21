import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  saveDiagram,
  loadDiagram,
  listDiagrams,
  saveTemplate,
  listTemplates,
} from "../server/storage.mjs";

async function freshRoot() {
  const root = await mkdtemp(join(tmpdir(), "cc-storage-"));
  await mkdir(join(root, "data", "diagrams"), { recursive: true });
  await mkdir(join(root, "data", "templates"), { recursive: true });
  await mkdir(join(root, "templates", "defaults"), { recursive: true });
  return root;
}

const sample = {
  id: "test-1",
  title: "Test",
  schema_version: 1,
  nodes: [],
  edges: [],
};

test("saveDiagram + loadDiagram round-trips", async () => {
  const root = await freshRoot();
  await saveDiagram(root, sample);
  const loaded = await loadDiagram(root, "test-1");
  assert.equal(loaded.id, "test-1");
  assert.equal(loaded.title, "Test");
  assert.ok(loaded.created_at);
  assert.ok(loaded.updated_at);
  await rm(root, { recursive: true });
});

test("loadDiagram returns null for missing", async () => {
  const root = await freshRoot();
  const result = await loadDiagram(root, "nope");
  assert.equal(result, null);
  await rm(root, { recursive: true });
});

test("saveDiagram rejects invalid schema", async () => {
  const root = await freshRoot();
  await assert.rejects(
    () => saveDiagram(root, { id: "bad" }),
    /schema_version/
  );
  await rm(root, { recursive: true });
});

test("listDiagrams returns previews", async () => {
  const root = await freshRoot();
  await saveDiagram(root, { ...sample, id: "a", title: "A" });
  await saveDiagram(root, { ...sample, id: "b", title: "B" });
  const list = await listDiagrams(root);
  assert.equal(list.length, 2);
  const ids = list.map((d) => d.id).sort();
  assert.deepEqual(ids, ["a", "b"]);
  assert.ok(list[0].title);
  assert.ok(list[0].updated_at);
  await rm(root, { recursive: true });
});

test("listDiagrams returns empty array when none", async () => {
  const root = await freshRoot();
  const list = await listDiagrams(root);
  assert.deepEqual(list, []);
  await rm(root, { recursive: true });
});

test("saveTemplate writes to data/templates/ and updates index", async () => {
  const root = await freshRoot();
  await saveTemplate(root, {
    slug: "my-tpl",
    name: "My Template",
    description: "A test",
    tags: ["test"],
    diagram: sample,
  });
  const list = await listTemplates(root);
  const userTpl = list.find((t) => t.slug === "my-tpl");
  assert.ok(userTpl);
  assert.equal(userTpl.source, "user");
  await rm(root, { recursive: true });
});

test("listTemplates merges defaults and user", async () => {
  const root = await freshRoot();
  await writeFile(
    join(root, "templates", "defaults", "index.json"),
    JSON.stringify({
      templates: [
        { slug: "default-tpl", name: "Default", description: "ships with skill", tags: [] },
      ],
    }),
    "utf8"
  );
  await saveTemplate(root, {
    slug: "user-tpl",
    name: "User",
    description: "user-added",
    tags: [],
    diagram: sample,
  });
  const list = await listTemplates(root);
  assert.equal(list.length, 2);
  assert.ok(list.find((t) => t.slug === "default-tpl" && t.source === "default"));
  assert.ok(list.find((t) => t.slug === "user-tpl" && t.source === "user"));
  await rm(root, { recursive: true });
});

test("saveDiagram preserves created_at on re-save", async () => {
  const root = await freshRoot();
  await saveDiagram(root, sample);
  const first = await loadDiagram(root, "test-1");
  await new Promise((r) => setTimeout(r, 20));
  await saveDiagram(root, { ...sample, title: "Updated" });
  const second = await loadDiagram(root, "test-1");
  assert.equal(second.created_at, first.created_at);
  assert.notEqual(second.updated_at, first.updated_at);
  assert.equal(second.title, "Updated");
  await rm(root, { recursive: true });
});
