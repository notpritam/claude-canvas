import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  reconnectEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { CardNode } from "./nodes/CardNode";
import { GroupNode } from "./nodes/GroupNode";
import { TypedEdge } from "./edges/TypedEdge";
import { NodePalette } from "./panels/NodePalette";
import { useDiagramStore } from "../stores/diagramStore";
import type { Diagram, DiagramNode, NodeType } from "../types";

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

function CanvasInner({ diagram }: { diagram: Diagram }) {
  const updateNodes = useDiagramStore((s) => s.updateNodes);
  const removeNodes = useDiagramStore((s) => s.removeNodes);
  const removeEdges = useDiagramStore((s) => s.removeEdges);
  const addEdge = useDiagramStore((s) => s.addEdge);
  const reattachEdge = useDiagramStore((s) => s.reattachEdge);
  const addNode = useDiagramStore((s) => s.addNode);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rfNodes = useMemo(() => toRfNodes(diagram), [diagram]);
  const rfEdges = useMemo(() => toRfEdges(diagram), [diagram]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removed = changes
        .filter((c): c is Extract<NodeChange, { type: "remove" }> => c.type === "remove")
        .map((c) => c.id)
        .filter((id) => !id.startsWith("group-"));
      if (removed.length) {
        removeNodes(removed);
        return;
      }
      const next = applyNodeChanges(changes, rfNodes);
      const dragEnded = changes.some(
        (c) => c.type === "position" && (c as { dragging?: boolean }).dragging === false
      );
      if (dragEnded) updateNodes(fromRfNodes(next, diagram));
    },
    [diagram, rfNodes, removeNodes, updateNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes
        .filter((c): c is Extract<EdgeChange, { type: "remove" }> => c.type === "remove")
        .map((c) => c.id);
      if (removed.length) {
        removeEdges(removed);
        return;
      }
      applyEdgeChanges(changes, rfEdges);
    },
    [rfEdges, removeEdges]
  );

  const onConnect: OnConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      addEdge(c.source, c.target, "request");
    },
    [addEdge]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;
      reconnectEdge(oldEdge, newConnection, rfEdges);
      reattachEdge(oldEdge.id, newConnection.source, newConnection.target);
    },
    [rfEdges, reattachEdge]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/claude-canvas-nodetype") as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  useEffect(() => {
    document.title = `${diagram.title} · claude-canvas`;
  }, [diagram.title]);

  return (
    <div ref={wrapperRef} className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        fitView
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
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
        <NodePalette />
      </ReactFlow>
    </div>
  );
}

export function Canvas({ diagram }: { diagram: Diagram }) {
  return <CanvasInner diagram={diagram} />;
}
