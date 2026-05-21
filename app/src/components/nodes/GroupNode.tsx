import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { DiagramGroup } from "../../types";

const GroupNodeImpl = ({ data }: NodeProps) => {
  const d = data as unknown as DiagramGroup;
  return (
    <div
      className="rounded-xl border border-dashed border-white/10 p-3 w-full h-full"
      style={{ borderColor: d.color ?? "rgba(255,255,255,0.1)" }}
    >
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
        {d.label}
      </div>
    </div>
  );
};

export const GroupNode = memo(GroupNodeImpl);
GroupNode.displayName = "GroupNode";
