import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import { CardNode } from "./nodes/CardNode";
import { GroupNode } from "./nodes/GroupNode";
import { TypedEdge } from "./edges/TypedEdge";
import { useDiagramStore } from "../stores/diagramStore";
import type { Diagram, DiagramNode, DiagramEdge } from "../types";

const nodeTypes: NodeTypes = {
  card: CardNode,
  group: GroupNode,
};

const edgeTypes: EdgeTypes = {
  typed: TypedEdge,
};

function toRfNodes(diagram: Diagram): Node[] {
  const groupNodes: Node[] = (diagram.groups ?? []).map((g) => ({
    id: `group-${g.id}`,
    type: "group",
    position: { x: 0, y: 0 },
    data: g as unknown as Record<string, unknown>,
    style: { width: 800, height: 400, background: "transparent" },
  }));
  const cards: Node[] = diagram.nodes.map((n) => ({
    id: n.id,
    type: "card",
    position: n.position,
    data: n as unknown as Record<string, unknown>,
    parentId: n.group ? `group-${n.group}` : undefined,
    extent: n.group ? ("parent" as const) : undefined,
  }));
  return [...groupNodes, ...cards];
}

function toRfEdges(diagram: Diagram): Edge[] {
  return diagram.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "typed",
    data: { label: e.label, edgeType: e.type } as Record<string, unknown>,
  }));
}

function fromRfNodes(rfNodes: Node[], diagram: Diagram): DiagramNode[] {
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const out: DiagramNode[] = [];
  for (const rf of rfNodes) {
    if (rf.type === "group") continue;
    const original = byId.get(rf.id);
    if (!original) continue;
    out.push({ ...original, position: rf.position });
  }
  return out;
}

function fromRfEdges(rfEdges: Edge[], diagram: Diagram): DiagramEdge[] {
  const byId = new Map(diagram.edges.map((e) => [e.id, e]));
  const out: DiagramEdge[] = [];
  for (const rf of rfEdges) {
    const original = byId.get(rf.id);
    if (original) out.push(original);
  }
  return out;
}

export function Canvas({ diagram }: { diagram: Diagram }) {
  const updateNodes = useDiagramStore((s) => s.updateNodes);
  const updateEdges = useDiagramStore((s) => s.updateEdges);

  const rfNodes = useMemo(() => toRfNodes(diagram), [diagram]);
  const rfEdges = useMemo(() => toRfEdges(diagram), [diagram]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, rfNodes);
      const dragEnded = changes.some(
        (c) => c.type === "position" && (c as { dragging?: boolean }).dragging === false
      );
      if (dragEnded) updateNodes(fromRfNodes(next, diagram));
    },
    [diagram, rfNodes, updateNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, rfEdges);
      if (changes.length > 0) updateEdges(fromRfEdges(next, diagram));
    },
    [diagram, rfEdges, updateEdges]
  );

  useEffect(() => {
    document.title = `${diagram.title} · claude-canvas`;
  }, [diagram.title]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-canvas-bg"
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2330" />
      <Controls className="!bg-canvas-panel !border-canvas-line" position="bottom-left" />
      <MiniMap
        className="!bg-canvas-panel !border-canvas-line"
        nodeColor="#6366f1"
        maskColor="rgba(0,0,0,0.7)"
        position="bottom-right"
      />
    </ReactFlow>
  );
}
