import { useEffect, useState } from "react";
import { useDiagramStore } from "../../stores/diagramStore";
import { cn } from "../../lib/cn";
import { SaveTemplateModal } from "./SaveTemplateModal";

export function Sidebar() {
  const previews = useDiagramStore((s) => s.previews);
  const currentId = useDiagramStore((s) => s.currentId);
  const diagram = useDiagramStore((s) => s.diagram);
  const setCurrentId = useDiagramStore((s) => s.setCurrentId);
  const refreshPreviews = useDiagramStore((s) => s.refreshPreviews);
  const dirty = useDiagramStore((s) => s.dirty);
  const saving = useDiagramStore((s) => s.saving);
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  useEffect(() => {
    refreshPreviews();
  }, [refreshPreviews]);

  return (
    <>
      <aside className="w-72 flex-shrink-0 border-l border-canvas-line bg-canvas-panel/70 flex flex-col">
        <div className="px-3 py-2.5 border-b border-canvas-line flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-gray-500">Diagrams</span>
          {(dirty || saving) && (
            <span className="text-[10px] text-amber-400">{saving ? "saving…" : "edited"}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {previews.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">No diagrams yet.</p>
          )}
          {previews.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrentId(p.id)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                currentId === p.id
                  ? "bg-indigo-950/50 text-indigo-200"
                  : "text-gray-300 hover:bg-canvas-line/50"
              )}
            >
              <div className="font-medium truncate">{p.title}</div>
              {p.description && (
                <div className="text-[10px] text-gray-500 truncate mt-0.5">{p.description}</div>
              )}
            </button>
          ))}
        </div>
        {diagram && (
          <div className="border-t border-canvas-line p-2">
            <button
              onClick={() => setShowSaveTpl(true)}
              className="w-full px-2 py-1.5 text-xs text-gray-300 hover:text-gray-100 hover:bg-canvas-line/50 rounded"
            >
              Save current as template…
            </button>
          </div>
        )}
      </aside>
      {showSaveTpl && <SaveTemplateModal onClose={() => setShowSaveTpl(false)} />}
    </>
  );
}
