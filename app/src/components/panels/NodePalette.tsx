import { NODE_THEME } from "../../theme/nodeTypes";
import type { NodeType } from "../../types";

const TYPES: NodeType[] = ["action", "data", "concept", "decision", "code", "note", "actor"];

export function NodePalette() {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-canvas-panel/90 border border-canvas-line rounded-lg p-1.5 shadow-lg">
      <div className="text-[9px] uppercase tracking-widest text-gray-500 px-1 pb-1">Drag to add</div>
      {TYPES.map((type) => {
        const theme = NODE_THEME[type];
        const Icon = theme.icon;
        return (
          <div
            key={type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/claude-canvas-nodetype", type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-canvas-line/50 cursor-grab active:cursor-grabbing"
            title={`Drag a ${type} node onto the canvas`}
          >
            <Icon size={13} className={theme.accent} />
            <span className="text-[11px] text-gray-300 capitalize">{type}</span>
          </div>
        );
      })}
    </div>
  );
}
