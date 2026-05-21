import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDiagram } from "../server/schema.mjs";

test("valid minimal diagram passes", () => {
  const result = validateDiagram({
    id: "test",
    title: "Test",
    schema_version: 1,
    nodes: [],
    edges: [],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("valid full diagram passes", () => {
  const result = validateDiagram({
    id: "auth-flow",
    title: "Auth Flow",
    description: "JWT auth",
    schema_version: 1,
    template_id: "request-response",
    groups: [{ id: "client", label: "Client", color: "#3b82f6" }],
    nodes: [
      {
        id: "n1",
        type: "action",
        label: "Click login",
        group: "client",
        position: { x: 0, y: 0 },
        content: "User clicks the **login** button.",
        style: { color: "#3b82f6", icon: "mouse-pointer" },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n1", label: "self", type: "request" },
    ],
    layout_hint: "left-to-right",
  });
  assert.equal(result.ok, true);
});

test("missing required field fails", () => {
  const result = validateDiagram({ id: "x", title: "X", nodes: [], edges: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("schema_version")));
});

test("invalid node type fails", () => {
  const result = validateDiagram({
    id: "x",
    title: "X",
    schema_version: 1,
    nodes: [{ id: "n1", type: "invalid-type", label: "x", position: { x: 0, y: 0 } }],
    edges: [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("type")));
});

test("invalid edge type fails", () => {
  const result = validateDiagram({
    id: "x",
    title: "X",
    schema_version: 1,
    nodes: [{ id: "n1", type: "action", label: "x", position: { x: 0, y: 0 } }],
    edges: [{ id: "e1", source: "n1", target: "n1", label: "x", type: "invalid" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("edge")));
});

test("edge referencing missing node fails", () => {
  const result = validateDiagram({
    id: "x",
    title: "X",
    schema_version: 1,
    nodes: [{ id: "n1", type: "action", label: "x", position: { x: 0, y: 0 } }],
    edges: [{ id: "e1", source: "n1", target: "missing", label: "x", type: "request" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("missing")));
});

test("duplicate node id fails", () => {
  const result = validateDiagram({
    id: "x",
    title: "X",
    schema_version: 1,
    nodes: [
      { id: "n1", type: "action", label: "x", position: { x: 0, y: 0 } },
      { id: "n1", type: "action", label: "y", position: { x: 100, y: 0 } },
    ],
    edges: [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("duplicate")));
});

test("non-object input fails", () => {
  assert.equal(validateDiagram(null).ok, false);
  assert.equal(validateDiagram("string").ok, false);
  assert.equal(validateDiagram([]).ok, false);
});
