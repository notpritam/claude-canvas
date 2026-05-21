import { createShapeId, createBindingId, type TLShapeId } from "@tldraw/tlschema";
import { toRichText } from "@tldraw/tlschema";
import type { Diagram, DiagramNode, DiagramEdge, EdgeType } from "../types";

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

export function nodeShapeId(diagramNodeId: string): TLShapeId {
  return createShapeId(`node-${diagramNodeId}`);
}
export function edgeShapeId(diagramEdgeId: string): TLShapeId {
  return createShapeId(`edge-${diagramEdgeId}`);
}

// ---------------------------------------------------------------------------
// Edge colours (tldraw default colour names)
// ---------------------------------------------------------------------------

const EDGE_COLOR: Record<EdgeType, string> = {
  request:      "blue",
  data:         "orange",
  causes:       "grey",
  "depends-on": "grey",
  bidirectional: "violet",
};

// ---------------------------------------------------------------------------
// Conversion output shape
// ---------------------------------------------------------------------------

export interface ConversionOutput {
  // CardShape partials accepted by editor.createShapes
  shapes: any[];
  // TLBindingCreate<TLArrowBinding>-compatible partials
  bindings: any[];
}

// ---------------------------------------------------------------------------
// diagramToShapes
// ---------------------------------------------------------------------------

export function diagramToShapes(diagram: Diagram): ConversionOutput {
  const shapes: any[] = [];
  const bindings: any[] = [];

  for (const n of diagram.nodes) {
    const id = nodeShapeId(n.id);
    shapes.push({
      id,
      type: "card",
      x: n.position.x,
      y: n.position.y,
      meta: { diagramNodeId: n.id },
      props: {
        w: 240,
        h: n.content ? 150 : 110,
        nodeType: n.type,
        label: n.label,
        content: n.content,
      },
    });
  }

  for (const e of diagram.edges) {
    const arrowId = edgeShapeId(e.id);
    shapes.push({
      id: arrowId,
      type: "arrow",
      x: 0,
      y: 0,
      meta: { diagramEdgeId: e.id, edgeType: e.type },
      props: {
        kind: "arc",
        color: EDGE_COLOR[e.type] ?? "grey",
        fill: "none",
        dash: e.type === "depends-on" ? "dashed" : "solid",
        size: "s",
        arrowheadStart: e.type === "bidirectional" ? "arrow" : "none",
        arrowheadEnd: "arrow",
        font: "draw",
        labelColor: "white",
        richText: toRichText(e.label ?? ""),
        labelPosition: 0.5,
        bend: 0,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        scale: 1,
      },
    });

    bindings.push({
      id: createBindingId(`${e.id}-start`),
      type: "arrow",
      fromId: arrowId,
      toId: nodeShapeId(e.source),
      props: {
        terminal: "start",
        isExact: false,
        isPrecise: false,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        snap: "none",
      },
    });
    bindings.push({
      id: createBindingId(`${e.id}-end`),
      type: "arrow",
      fromId: arrowId,
      toId: nodeShapeId(e.target),
      props: {
        terminal: "end",
        isExact: false,
        isPrecise: false,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        snap: "none",
      },
    });
  }

  return { shapes, bindings };
}

// ---------------------------------------------------------------------------
// shapesToDiagram
// ---------------------------------------------------------------------------

export function shapesToDiagram(
  shapes: any[],
  bindings: any[],
  original: Diagram
): Diagram {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  const shapesById = new Map<string, any>(shapes.map((s) => [s.id, s]));

  for (const s of shapes) {
    if (s.type === "card") {
      const diagramId: string = s.meta?.diagramNodeId ?? s.id;
      nodes.push({
        id: diagramId,
        type: s.props.nodeType,
        label: s.props.label,
        content: s.props.content,
        position: { x: s.x, y: s.y },
        group: undefined,
      });
    }
  }

  // Build per-arrow binding map: arrowId → { start?: TLShapeId, end?: TLShapeId }
  const arrowToBindings = new Map<string, { start?: string; end?: string }>();
  for (const b of bindings) {
    if (b.type !== "arrow") continue;
    const entry = arrowToBindings.get(b.fromId) ?? {};
    const terminal: string = b.props?.terminal ?? "";
    if (terminal === "start") entry.start = b.toId;
    else if (terminal === "end") entry.end = b.toId;
    arrowToBindings.set(b.fromId, entry);
  }

  for (const s of shapes) {
    if (s.type === "arrow") {
      const bs = arrowToBindings.get(s.id);
      if (!bs?.start || !bs?.end) continue;
      const sourceShape = shapesById.get(bs.start);
      const targetShape = shapesById.get(bs.end);
      if (!sourceShape || !targetShape) continue;
      const sourceDiagId: string = sourceShape.meta?.diagramNodeId ?? sourceShape.id;
      const targetDiagId: string = targetShape.meta?.diagramNodeId ?? targetShape.id;
      const diagramEdgeId: string = s.meta?.diagramEdgeId ?? s.id;
      edges.push({
        id: diagramEdgeId,
        source: sourceDiagId,
        target: targetDiagId,
        label: s.props.text || undefined,
        type: (s.meta?.edgeType as EdgeType) ?? "request",
      });
    }
  }

  return {
    ...original,
    nodes,
    edges,
  };
}
