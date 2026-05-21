import { useCallback, useEffect, useMemo, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useDiagramStore } from "../stores/diagramStore";
import type { Diagram } from "../types";
import { toExcalidrawScene, fromExcalidrawScene } from "../excalidraw/converters";
import type { ExcalidrawSceneElement } from "../excalidraw/converters";
import { debounce } from "../lib/debounce";

// Use `any` for the imperative API type to avoid wrestling with deep Excalidraw
// type internals (ExcalidrawImperativeAPI references App class internals).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;

export function Canvas({ diagram }: { diagram: Diagram }) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const replaceFromScene = useDiagramStore((s) => s.replaceFromScene);

  // Only reset the scene when the diagram identity (id) changes.
  // SSE hot-replace updates are handled via the useEffect below.
  const initialData = useMemo(
    () => ({
      elements: toExcalidrawScene(diagram).elements,
      appState: {
        viewBackgroundColor: "#0b0d12",
        theme: "dark" as const,
        gridSize: null,
      },
      scrollToContent: true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram.id]
  );

  // SSE hot-replace: when the server pushes a new diagram version, update the scene
  useEffect(() => {
    if (!apiRef.current) return;
    const scene = toExcalidrawScene(diagram);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiRef.current.updateScene({ elements: scene.elements as any });
  }, [diagram]);

  useEffect(() => {
    document.title = `${diagram.title} · claude-canvas`;
  }, [diagram.title]);

  const onChangeDebounced = useMemo(
    () =>
      debounce((elements: readonly ExcalidrawSceneElement[]) => {
        const next = fromExcalidrawScene(elements as ExcalidrawSceneElement[], diagram);
        replaceFromScene(next);
      }, 800),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram.id, replaceFromScene]
  );

  const onChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[]) => {
      onChangeDebounced(elements as readonly ExcalidrawSceneElement[]);
    },
    [onChangeDebounced]
  );

  return (
    <div className="w-full h-full">
      <Excalidraw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        excalidrawAPI={(api: any) => {
          apiRef.current = api;
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={initialData as any}
        onChange={onChange}
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveAsImage: true,
            export: false,
            saveToActiveFile: false,
          },
          tools: { image: false },
        }}
      />
    </div>
  );
}
