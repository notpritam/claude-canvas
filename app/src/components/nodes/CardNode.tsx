import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NODE_THEME } from "../../theme/nodeTypes";
import type { DiagramNode } from "../../types";
import { useDiagramStore } from "../../stores/diagramStore";
import { cn } from "../../lib/cn";

type CardNodeData = Pick<DiagramNode, "type" | "label" | "content" | "style">;

const CardNodeImpl = ({ id, data }: NodeProps) => {
  const d = data as unknown as CardNodeData;
  const theme = NODE_THEME[d.type];
  const Icon = theme.icon;
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(d.label);
  }, [d.label]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== d.label) updateNodeLabel(id, next);
    else setDraft(d.label);
  };

  return (
    <div
      className={cn(
        "rounded-lg ring-1 backdrop-blur-sm shadow-lg min-w-[180px] max-w-[360px]",
        theme.bg,
        theme.ring
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-600 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <Icon size={14} className={theme.accent} />
        <span className="text-[11px] uppercase tracking-wider text-gray-500">{d.type}</span>
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(d.label);
                setEditing(false);
              }
            }}
            className="nodrag w-full bg-canvas-bg/60 border border-canvas-line rounded px-1.5 py-0.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        ) : (
          <div
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
            className="text-sm text-gray-100 font-medium cursor-text"
          >
            {d.label}
          </div>
        )}
        {d.content && (
          <div className="mt-2 text-xs text-gray-400 prose prose-invert prose-sm max-w-none prose-pre:bg-black/40 prose-pre:text-xs prose-code:text-[11px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.content}</ReactMarkdown>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-600 !w-2.5 !h-2.5" />
    </div>
  );
};

export const CardNode = memo(CardNodeImpl);
CardNode.displayName = "CardNode";
