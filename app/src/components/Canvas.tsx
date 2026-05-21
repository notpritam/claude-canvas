import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
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
import type { Diagram, DiagramNode, DiagramGroup, NodeType } from "../types";

const nodeTypes: NodeTypes = {
  card: CardNode,
  group: GroupNode,
};

const edgeTypes: EdgeTypes = {
  typed: TypedEdge,
};

const GROUP_STYLE = { width: 800, height: 400, background: "transparent" } as const;

// Stable transform: keep referentially-equal output nodes when their source DiagramNode is unchanged.
// Defeats unnecessary CardNode re-renders, which is critical when one node moves and all others should stay still.
function createStableTransform() {
  const cache = new Map<string, { src: DiagramNode | DiagramGroup; out: Node }>();
  return {
    nodes(diagram: Diagram): Node[] {
      const seen = new Set<string>();
      const out: Node[] = [];
      for (const g of diagram.groups ?? []) {
        const key = `group-${g.id}`;
        seen.add(key);
        const cached = cache.get(key);
        if (cached && cached.src === g) {
          out.push(cached.out);
        } else {
          const node: Node = {
            id: key,
            type: "group",
            position: { x: 0, y: 0 },
            data: g as unknown as Record<string, unknown>,
            style: GROUP_STYLE,
          };
          cache.set(key, { src: g, out: node });
          out.push(node);
        }
      }
      for (const n of diagram.nodes) {
        seen.add(n.id);
        const cached = cache.get(n.id);
        if (cached && cached.src === n) {
          out.push(cached.out);
        } else {
          const node: Node = {
            id: n.id,
            type: "card",
            position: n.position,
            data: n as unknown as Record<string, unknown>,
            parentId: n.group ? `group-${n.group}` : undefined,
            extent: n.group ? ("parent" as const) : undefined,
          };
          cache.set(n.id, { src: n, out: node });
          out.push(node);
        }
      }
      // Evict stale entries so the cache doesn't grow indefinitely
      for (const key of cache.keys()) if (!seen.has(key)) cache.delete(key);
      return out;
    },
  };
}

function createStableEdgeTransform() {
  const cache = new Map<string, { src: Diagram["edges"][number]; out: Edge }>();
  return (diagram: Diagram): Edge[] => {
    const seen = new Set<string>();
    const out: Edge[] = [];
    for (const e of diagram.edges) {
      seen.add(e.id);
      const cached = cache.get(e.id);
      if (cached && cached.src === e) {
        out.push(cached.out);
      } else {
        const edge: Edge = {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "typed",
          data: { label: e.label, edgeType: e.type } as Record<string, unknown>,
        };
        cache.set(e.id, { src: e, out: edge });
        out.push(edge);
      }
    }
    for (const key of cache.keys()) if (!seen.has(key)) cache.delete(key);
    return out;
  };
}

function fromRfNodes(rfNodes: Node[], diagram: Diagram): DiagramNode[] {
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const out: DiagramNode[] = [];
  for (const rf of rfNodes) {
    if (rf.type === "group") continue;
    const original = byId.get(rf.id);
    if (!original) continue;
    // Only allocate a new object when position actually changed; preserves identity for unmoved nodes.
    if (rf.position.x === original.position.x && rf.position.y === original.position.y) {
      out.push(original);
    } else {
      out.push({ ...original, position: rf.position });
    }
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
  const nodeTransformRef = useRef(createStableTransform());
  const edgeTransformRef = useRef(createStableEdgeTransform());

  const rfNodes = useMemo(
    () => nodeTransformRef.current.nodes(diagram),
    [diagram.nodes, diagram.groups]
  );
  const rfEdges = useMemo(
    () => edgeTransformRef.current(diagram),
    [diagram.edges]
  );

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
      const dragEnded = changes.some(
        (c) => c.type === "position" && (c as { dragging?: boolean }).dragging === false
      );
      if (dragEnded) {
        const next = applyNodeChanges(changes, rfNodes);
        updateNodes(fromRfNodes(next, diagram));
      }
    },
    [diagram, rfNodes, removeNodes, updateNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes
        .filter((c): c is Extract<EdgeChange, { type: "remove" }> => c.type === "remove")
        .map((c) => c.id);
      if (removed.length) removeEdges(removed);
    },
    [removeEdges]
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
    <div
      ref={wrapperRef}
      className="relative w-full h-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
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
      </ReactFlow>
      {/* Palette is OUTSIDE ReactFlow so it doesn't re-render on internal viewport state changes. */}
      <NodePalette />
    </div>
  );
}

export function Canvas({ diagram }: { diagram: Diagram }) {
  return <CanvasInner diagram={diagram} />;
}
