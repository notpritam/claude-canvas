const NODE_TYPES = new Set([
  "action",
  "data",
  "concept",
  "decision",
  "code",
  "note",
  "actor",
]);

const EDGE_TYPES = new Set([
  "request",
  "data",
  "causes",
  "depends-on",
  "bidirectional",
]);

const REQUIRED_TOP = ["id", "title", "schema_version", "nodes", "edges"];

export function validateDiagram(input) {
  const errors = [];

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["root must be an object"] };
  }

  for (const key of REQUIRED_TOP) {
    if (!(key in input)) errors.push(`missing required field: ${key}`);
  }

  if (typeof input.id !== "string" || !input.id) errors.push("id must be non-empty string");
  if (typeof input.title !== "string" || !input.title) errors.push("title must be non-empty string");
  if (input.schema_version !== 1) errors.push("schema_version must be 1");
  if (!Array.isArray(input.nodes)) errors.push("nodes must be an array");
  if (!Array.isArray(input.edges)) errors.push("edges must be an array");

  if (errors.length) return { ok: false, errors };

  const nodeIds = new Set();
  const groupIds = new Set();

  if (Array.isArray(input.groups)) {
    for (const g of input.groups) {
      if (!g || typeof g.id !== "string") {
        errors.push("group missing id");
        continue;
      }
      if (groupIds.has(g.id)) errors.push(`duplicate group id: ${g.id}`);
      groupIds.add(g.id);
      if (typeof g.label !== "string") errors.push(`group ${g.id} missing label`);
    }
  }

  for (const n of input.nodes) {
    if (!n || typeof n !== "object") {
      errors.push("node must be an object");
      continue;
    }
    if (typeof n.id !== "string" || !n.id) {
      errors.push("node missing id");
      continue;
    }
    if (nodeIds.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
    nodeIds.add(n.id);

    if (!NODE_TYPES.has(n.type)) {
      errors.push(`node ${n.id}: invalid type "${n.type}" (allowed: ${[...NODE_TYPES].join(", ")})`);
    }
    if (typeof n.label !== "string") errors.push(`node ${n.id}: label must be string`);
    if (!n.position || typeof n.position.x !== "number" || typeof n.position.y !== "number") {
      errors.push(`node ${n.id}: position must be {x: number, y: number}`);
    }
    if (n.group !== undefined && !groupIds.has(n.group)) {
      errors.push(`node ${n.id}: references missing group "${n.group}"`);
    }
  }

  for (const e of input.edges) {
    if (!e || typeof e !== "object") {
      errors.push("edge must be an object");
      continue;
    }
    if (typeof e.id !== "string" || !e.id) {
      errors.push("edge missing id");
      continue;
    }
    if (!nodeIds.has(e.source)) errors.push(`edge ${e.id}: source references missing node "${e.source}"`);
    if (!nodeIds.has(e.target)) errors.push(`edge ${e.id}: target references missing node "${e.target}"`);
    if (!EDGE_TYPES.has(e.type)) {
      errors.push(`edge ${e.id}: invalid edge type "${e.type}" (allowed: ${[...EDGE_TYPES].join(", ")})`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export const ALLOWED_NODE_TYPES = [...NODE_TYPES];
export const ALLOWED_EDGE_TYPES = [...EDGE_TYPES];
