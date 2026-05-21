import { useEffect, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { EmptyState } from "./components/EmptyState";
import { Sidebar } from "./components/panels/Sidebar";
import { useDiagramStore } from "./stores/diagramStore";
import { createSseClient } from "./lib/sse";

function readHashId(): string | null {
  const h = window.location.hash.replace(/^#\/?/, "");
  return h ? decodeURIComponent(h) : null;
}

export default function App() {
  const diagram = useDiagramStore((s) => s.diagram);
  const setCurrentId = useDiagramStore((s) => s.setCurrentId);
  const refreshPreviews = useDiagramStore((s) => s.refreshPreviews);
  const hotReplace = useDiagramStore((s) => s.hotReplace);

  const sse = useMemo(() => createSseClient(), []);

  useEffect(() => {
    sse.connect();
    const offUpdate = sse.on("diagram:update", async (payload) => {
      const { id } = payload as { id: string };
      const { api } = await import("./lib/api");
      const next = await api.loadDiagram(id);
      hotReplace(next);
      refreshPreviews();
    });
    return () => {
      offUpdate?.();
      sse.close();
    };
  }, [sse, hotReplace, refreshPreviews]);

  useEffect(() => {
    const id = readHashId();
    if (id) setCurrentId(id);
    const onHash = () => {
      const next = readHashId();
      if (next) setCurrentId(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [setCurrentId]);

  return (
    <div className="h-screen w-screen flex">
      <main className="flex-1 relative">
        {diagram ? (
          <ReactFlowProvider>
            <Canvas diagram={diagram} />
          </ReactFlowProvider>
        ) : (
          <EmptyState />
        )}
      </main>
      <Sidebar />
    </div>
  );
}
