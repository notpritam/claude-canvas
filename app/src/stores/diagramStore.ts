import { create } from "zustand";
import type { Diagram, DiagramPreview, DiagramNode, DiagramEdge, NodeType, EdgeType } from "../types";
import { api } from "../lib/api";
import { debounce } from "../lib/debounce";

interface State {
  currentId: string | null;
  diagram: Diagram | null;
  previews: DiagramPreview[];
  dirty: boolean;
  saving: boolean;
  error: string | null;
}

interface Actions {
  setCurrentId: (id: string | null) => Promise<void>;
  refreshPreviews: () => Promise<void>;
  updateNodes: (nodes: DiagramNode[]) => void;
  updateEdges: (edges: DiagramEdge[]) => void;
  hotReplace: (diagram: Diagram) => void;
  saveNow: () => Promise<void>;
  // Editor mutations
  addNode: (type: NodeType, position: { x: number; y: number }, label?: string) => void;
  removeNodes: (ids: string[]) => void;
  updateNodeLabel: (id: string, label: string) => void;
  addEdge: (source: string, target: string, type?: EdgeType, label?: string) => void;
  removeEdges: (ids: string[]) => void;
  reattachEdge: (id: string, newSource: string, newTarget: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
}

const debouncedSave = debounce(async () => {
  const { saveNow } = useDiagramStore.getState();
  await saveNow();
}, 1500);

function genId(prefix: string, existing: Set<string>): string {
  let i = 1;
  while (existing.has(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}

export const useDiagramStore = create<State & Actions>((set, get) => ({
  currentId: null,
  diagram: null,
  previews: [],
  dirty: false,
  saving: false,
  error: null,

  setCurrentId: async (id) => {
    set({ currentId: id });
    if (!id) {
      set({ diagram: null });
      return;
    }
    try {
      const diagram = await api.loadDiagram(id);
      set({ diagram, dirty: false, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  refreshPreviews: async () => {
    try {
      const previews = await api.listDiagrams();
      set({ previews });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateNodes: (nodes) => {
    const d = get().diagram;
    if (!d) return;
    set({ diagram: { ...d, nodes }, dirty: true });
    debouncedSave();
  },

  updateEdges: (edges) => {
    const d = get().diagram;
    if (!d) return;
    set({ diagram: { ...d, edges }, dirty: true });
    debouncedSave();
  },

  hotReplace: (diagram) => {
    if (get().dirty) {
      console.warn("Server pushed update while local edits pending — keeping local");
      return;
    }
    set({ diagram, dirty: false, currentId: diagram.id });
  },

  saveNow: async () => {
    const d = get().diagram;
    if (!d || !get().dirty) return;
    set({ saving: true });
    try {
      const result = await api.saveDiagram(d);
      set({ diagram: result.diagram, dirty: false, saving: false, error: null });
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
    }
  },

  addNode: (type, position, label) => {
    const d = get().diagram;
    if (!d) return;
    const existing = new Set(d.nodes.map((n) => n.id));
    const id = genId(type, existing);
    const next: DiagramNode = {
      id,
      type,
      label: label ?? type[0].toUpperCase() + type.slice(1),
      position,
    };
    set({ diagram: { ...d, nodes: [...d.nodes, next] }, dirty: true });
    debouncedSave();
  },

  removeNodes: (ids) => {
    const d = get().diagram;
    if (!d) return;
    const idSet = new Set(ids);
    const nodes = d.nodes.filter((n) => !idSet.has(n.id));
    const edges = d.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target));
    set({ diagram: { ...d, nodes, edges }, dirty: true });
    debouncedSave();
  },

  updateNodeLabel: (id, label) => {
    const d = get().diagram;
    if (!d) return;
    const nodes = d.nodes.map((n) => (n.id === id ? { ...n, label } : n));
    set({ diagram: { ...d, nodes }, dirty: true });
    debouncedSave();
  },

  addEdge: (source, target, type = "request", label) => {
    const d = get().diagram;
    if (!d) return;
    if (source === target) return; // disallow self-loops via UI
    const existing = new Set(d.edges.map((e) => e.id));
    const id = genId("edge", existing);
    const next: DiagramEdge = { id, source, target, type, label };
    set({ diagram: { ...d, edges: [...d.edges, next] }, dirty: true });
    debouncedSave();
  },

  removeEdges: (ids) => {
    const d = get().diagram;
    if (!d) return;
    const idSet = new Set(ids);
    const edges = d.edges.filter((e) => !idSet.has(e.id));
    set({ diagram: { ...d, edges }, dirty: true });
    debouncedSave();
  },

  reattachEdge: (id, newSource, newTarget) => {
    const d = get().diagram;
    if (!d) return;
    const edges = d.edges.map((e) =>
      e.id === id ? { ...e, source: newSource, target: newTarget } : e
    );
    set({ diagram: { ...d, edges }, dirty: true });
    debouncedSave();
  },

  updateEdgeLabel: (id, label) => {
    const d = get().diagram;
    if (!d) return;
    const edges = d.edges.map((e) => (e.id === id ? { ...e, label } : e));
    set({ diagram: { ...d, edges }, dirty: true });
    debouncedSave();
  },
}));
