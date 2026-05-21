/**
 * Converters between our Diagram JSON schema and Excalidraw element arrays.
 *
 * We define minimal local element interfaces rather than importing from
 * @excalidraw/excalidraw's deep type tree (which uses branded primitives like
 * Radians, LocalPoint, FractionalIndex that require casting anyway).
 */
import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeType, EdgeType } from "../types";

// ---------------------------------------------------------------------------
// Minimal local element shape interfaces
// ---------------------------------------------------------------------------

interface EBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: 0;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  roundness: { type: number; value?: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  index: string | null;
  isDeleted: false;
  boundElements: Array<{ id: string; type: "text" | "arrow" }> | null;
  updated: number;
  link: null;
  locked: false;
  customData?: Record<string, unknown>;
}

interface ERectangle extends EBase {
  type: "rectangle";
}

interface EText extends EBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  containerId: string | null;
  originalText: string;
  autoResize: boolean;
  lineHeight: number;
}

interface EArrow extends EBase {
  type: "arrow";
  points: [number, number][];
  lastCommittedPoint: null;
  startBinding: { elementId: string; focus: number; gap: number } | null;
  endBinding: { elementId: string; focus: number; gap: number } | null;
  startArrowhead: "arrow" | null;
  endArrowhead: "arrow" | null;
  elbowed: false;
}

interface EFrame extends EBase {
  type: "frame";
  name: string | null;
}

export type ExcalidrawSceneElement = ERectangle | EText | EArrow | EFrame;

// ---------------------------------------------------------------------------
// Color table
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<NodeType, { bg: string; stroke: string }> = {
  action:   { bg: "#dbeafe", stroke: "#2563eb" },
  data:     { bg: "#fef3c7", stroke: "#d97706" },
  concept:  { bg: "#e9d5ff", stroke: "#9333ea" },
  decision: { bg: "#fef9c3", stroke: "#ca8a04" },
  code:     { bg: "#e5e7eb", stroke: "#4b5563" },
  note:     { bg: "#fee2e2", stroke: "#dc2626" },
  actor:    { bg: "#e0e7ff", stroke: "#4f46e5" },
};

const EDGE_COLORS: Record<EdgeType, string> = {
  request:       "#2563eb",
  data:          "#d97706",
  causes:        "#6b7280",
  "depends-on":  "#6b7280",
  bidirectional: "#9333ea",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _counter = 1;
function nextSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
function nextVersion(): number {
  return _counter++;
}
function nextIndex(): string {
  // Simple fractional index: use current timestamp padded
  return `a${Date.now().toString(36)}${(_counter++).toString(36)}`;
}

function base(id: string): Omit<EBase, "type"> {
  return {
    id,
    x: 0,
    y: 0,
    width: 200,
    height: 110,
    angle: 0,
    strokeColor: "#1e293b",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nextSeed(),
    version: nextVersion(),
    versionNonce: nextSeed(),
    index: nextIndex(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

// ---------------------------------------------------------------------------
// DiagramNode → rectangle + text
// ---------------------------------------------------------------------------

const NODE_WIDTH = 200;
const NODE_HEIGHT_BASE = 110;
const NODE_HEIGHT_WITH_CONTENT = 180;

function nodeToElements(n: DiagramNode): [ERectangle, EText] {
  const colors = NODE_COLORS[n.type] ?? { bg: "#e5e7eb", stroke: "#4b5563" };
  const height = n.content ? NODE_HEIGHT_WITH_CONTENT : NODE_HEIGHT_BASE;
  const textId = `t_${n.id}`;

  const rect: ERectangle = {
    ...base(n.id),
    type: "rectangle",
    x: n.position.x,
    y: n.position.y,
    width: NODE_WIDTH,
    height,
    strokeColor: colors.stroke,
    backgroundColor: colors.bg,
    fillStyle: "solid",
    roughness: 0,
    roundness: { type: 3 },
    groupIds: n.group ? [n.group] : [],
    boundElements: [{ id: textId, type: "text" }],
  };

  const displayText = n.content ? `${n.label}\n\n${n.content}` : n.label;

  const text: EText = {
    ...base(textId),
    type: "text",
    x: n.position.x,
    y: n.position.y,
    width: NODE_WIDTH,
    height,
    text: displayText,
    originalText: displayText,
    fontSize: 16,
    fontFamily: 2,          // Helvetica
    textAlign: "center",
    verticalAlign: "middle",
    containerId: n.id,
    autoResize: true,
    lineHeight: 1.25,
    strokeColor: "#1e293b",
    backgroundColor: "transparent",
    groupIds: n.group ? [n.group] : [],
  };

  return [rect, text];
}

// ---------------------------------------------------------------------------
// DiagramEdge → arrow (+ optional label text)
// ---------------------------------------------------------------------------

function edgeToElements(
  e: DiagramEdge,
  nodeMap: Map<string, DiagramNode>
): Array<EArrow | EText> {
  const src = nodeMap.get(e.source);
  const tgt = nodeMap.get(e.target);

  const srcX = (src?.position.x ?? 0) + NODE_WIDTH / 2;
  const srcY = (src?.position.y ?? 0) + NODE_HEIGHT_BASE / 2;
  const tgtX = (tgt?.position.x ?? 300) + NODE_WIDTH / 2;
  const tgtY = (tgt?.position.y ?? 0) + NODE_HEIGHT_BASE / 2;

  const isDashed = e.type === "depends-on" || e.style?.dashed;
  const isBidi = e.type === "bidirectional";

  const arrow: EArrow = {
    ...base(e.id),
    type: "arrow",
    x: srcX,
    y: srcY,
    width: Math.abs(tgtX - srcX),
    height: Math.abs(tgtY - srcY),
    points: [[0, 0], [tgtX - srcX, tgtY - srcY]],
    lastCommittedPoint: null,
    strokeColor: e.style?.color ?? EDGE_COLORS[e.type] ?? "#6b7280",
    strokeStyle: isDashed ? "dashed" : "solid",
    strokeWidth: 1.5,
    fillStyle: "solid",
    roughness: 0,
    startBinding: { elementId: e.source, focus: 0, gap: 8 },
    endBinding: { elementId: e.target, focus: 0, gap: 8 },
    startArrowhead: isBidi ? "arrow" : null,
    endArrowhead: "arrow",
    elbowed: false,
    boundElements: e.label ? [{ id: `t_${e.id}`, type: "text" }] : null,
  };

  const elements: Array<EArrow | EText> = [arrow];

  if (e.label) {
    const labelText: EText = {
      ...base(`t_${e.id}`),
      type: "text",
      x: (srcX + tgtX) / 2 - 60,
      y: (srcY + tgtY) / 2 - 10,
      width: 120,
      height: 20,
      text: e.label,
      originalText: e.label,
      fontSize: 12,
      fontFamily: 2,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: e.id,
      autoResize: true,
      lineHeight: 1.25,
      strokeColor: "#6b7280",
      backgroundColor: "transparent",
    };
    elements.push(labelText);
  }

  return elements;
}

// ---------------------------------------------------------------------------
// DiagramGroup → frame
// ---------------------------------------------------------------------------

const FRAME_PADDING = 40;

function groupToFrame(g: DiagramGroup, nodes: DiagramNode[]): EFrame {
  const members = nodes.filter((n) => n.group === g.id);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of members) {
    const h = n.content ? NODE_HEIGHT_WITH_CONTENT : NODE_HEIGHT_BASE;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, n.position.y + h);
  }

  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 400; maxY = 300;
  }

  return {
    ...base(g.id),
    type: "frame",
    x: minX - FRAME_PADDING,
    y: minY - FRAME_PADDING,
    width: maxX - minX + FRAME_PADDING * 2,
    height: maxY - minY + FRAME_PADDING * 2,
    name: g.label,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "solid",
    roughness: 0,
    roundness: null,
  };
}

// ---------------------------------------------------------------------------
// Public: toExcalidrawScene
// ---------------------------------------------------------------------------

export interface ExcalidrawScene {
  elements: ExcalidrawSceneElement[];
}

export function toExcalidrawScene(diagram: Diagram): ExcalidrawScene {
  const nodeMap = new Map<string, DiagramNode>(diagram.nodes.map((n) => [n.id, n]));
  const elements: ExcalidrawSceneElement[] = [];

  // Frames first (so nodes render on top)
  for (const g of diagram.groups ?? []) {
    const frame = groupToFrame(g, diagram.nodes);
    elements.push(frame);
  }

  // Nodes
  for (const n of diagram.nodes) {
    const [rect, text] = nodeToElements(n);
    // Assign frameId if node belongs to a group
    if (n.group) {
      rect.frameId = n.group;
      text.frameId = n.group;
    }
    elements.push(rect, text);
  }

  // Edges
  for (const e of diagram.edges) {
    elements.push(...edgeToElements(e, nodeMap));
  }

  return { elements };
}

// ---------------------------------------------------------------------------
// Public: fromExcalidrawScene
// ---------------------------------------------------------------------------

/**
 * Converts Excalidraw elements back to our Diagram format.
 *
 * We use the existing diagram as the source of truth for metadata (title,
 * description, groups, edge types, etc.) and only update positions and
 * labels from the elements.
 */
export function fromExcalidrawScene(
  elements: ExcalidrawSceneElement[],
  diagram: Diagram
): Diagram {
  // Build a map of element id → element for O(1) lookup
  const elementMap = new Map<string, ExcalidrawSceneElement>();
  for (const el of elements) {
    if (!el.isDeleted) elementMap.set(el.id, el);
  }

  // Update node positions and labels from rectangle elements
  const nodes: Diagram["nodes"] = diagram.nodes.map((n) => {
    const rect = elementMap.get(n.id);
    if (!rect || rect.type !== "rectangle") return n;

    // Check if label changed (from bound text element)
    const textEl = elementMap.get(`t_${n.id}`);
    let label = n.label;
    let content = n.content;
    if (textEl && textEl.type === "text") {
      const raw = textEl.text;
      // If the node had content, text = "label\n\ncontent"
      if (n.content) {
        const sep = raw.indexOf("\n\n");
        if (sep !== -1) {
          label = raw.slice(0, sep);
          content = raw.slice(sep + 2) || undefined;
        } else {
          label = raw;
          content = undefined;
        }
      } else {
        label = raw;
      }
    }

    return {
      ...n,
      position: { x: rect.x, y: rect.y },
      label,
      content,
    };
  });

  // Remove nodes that were deleted in Excalidraw (their rect is missing)
  const survivingNodes = nodes.filter((n) => elementMap.has(n.id));

  // Remove edges whose source or target nodes were deleted
  const survivingNodeIds = new Set(survivingNodes.map((n) => n.id));
  const survivingEdges = diagram.edges.filter(
    (e) =>
      elementMap.has(e.id) &&
      survivingNodeIds.has(e.source) &&
      survivingNodeIds.has(e.target)
  );

  return {
    ...diagram,
    nodes: survivingNodes,
    edges: survivingEdges,
  };
}
