import { useCallback, useEffect, useMemo, useRef } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useDiagramStore } from "../stores/diagramStore";
import type { Diagram } from "../types";
import { CardShapeUtil } from "../tldraw/CardShape";
import { diagramToShapes, shapesToDiagram } from "../tldraw/converters";
import { debounce } from "../lib/debounce";

const customShapeUtils = [CardShapeUtil];

function loadDiagram(editor: Editor, diagram: Diagram) {
  const { shapes, bindings } = diagramToShapes(diagram);
  editor.store.mergeRemoteChanges(() => {
    editor.createShapes(shapes);
    if (bindings.length > 0) {
      try {
        editor.createBindings(bindings);
      } catch (err) {
        console.warn("createBindings failed", err);
      }
    }
  });
}

export function Canvas({ diagram }: { diagram: Diagram }) {
  const editorRef = useRef<Editor | null>(null);
  const replaceFromScene = useDiagramStore((s) => s.replaceFromScene);
  const lastSyncedDiagramRef = useRef<Diagram>(diagram);
  const isInternalChangeRef = useRef(false);

  const onMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      loadDiagram(editor, diagram);
      editor.zoomToFit();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram.id]
  );

  // SSE hot-replace: sync updated diagram into tldraw without discarding local layout
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (lastSyncedDiagramRef.current === diagram) return;
    lastSyncedDiagramRef.current = diagram;
    isInternalChangeRef.current = true;
    editor.store.mergeRemoteChanges(() => {
      const allShapes = editor.getCurrentPageShapes();
      editor.deleteShapes(allShapes.map((s) => s.id));
      const { shapes, bindings } = diagramToShapes(diagram);
      editor.createShapes(shapes);
      if (bindings.length > 0) {
        try {
          editor.createBindings(bindings);
        } catch (err) {
          console.warn("createBindings failed on hot-replace", err);
        }
      }
    });
    queueMicrotask(() => {
      isInternalChangeRef.current = false;
    });
  }, [diagram]);

  useEffect(() => {
    document.title = `${diagram.title} · claude-canvas`;
  }, [diagram.title]);

  const persistDebounced = useMemo(
    () =>
      debounce(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (isInternalChangeRef.current) return;
        const shapes = editor.getCurrentPageShapes() as any[];
        const bindings = editor.store
          .allRecords()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r.typeName === "binding") as any[];
        const next = shapesToDiagram(shapes, bindings, lastSyncedDiagramRef.current);
        lastSyncedDiagramRef.current = next;
        replaceFromScene(next);
      }, 600),
    [replaceFromScene]
  );

  // Listen for user-originated store changes and persist
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const unsubscribe = editor.store.listen(
      () => {
        persistDebounced();
      },
      { source: "user", scope: "all" }
    );
    return unsubscribe;
  }, [persistDebounced]);

  return (
    <div className="w-full h-full">
      <Tldraw shapeUtils={customShapeUtils} onMount={onMount} />
    </div>
  );
}
