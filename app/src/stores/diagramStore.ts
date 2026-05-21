import { create } from "zustand";
import type { Diagram, DiagramPreview, DiagramNode, DiagramEdge } from "../types";
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
}

const debouncedSave = debounce(async () => {
  const { saveNow } = useDiagramStore.getState();
  await saveNow();
}, 1500);

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
    // Server pushed a new version (Claude generated update).
    // If dirty, keep local edits and warn.
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
}));
