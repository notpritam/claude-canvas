import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { EDGE_THEME } from "../../theme/nodeTypes";
import type { EdgeType } from "../../types";

interface TypedEdgeData {
  label?: string;
  edgeType: EdgeType;
}

const TypedEdgeImpl = (props: EdgeProps) => {
  const {
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, markerEnd,
  } = props;
  const d = (data ?? {}) as unknown as TypedEdgeData;
  const theme = EDGE_THEME[d.edgeType ?? "request"];
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: theme.stroke,
          strokeWidth: theme.strokeWidth,
          strokeDasharray: theme.dashed ? "6 4" : undefined,
        }}
        className={theme.animated ? "animate-pulse" : ""}
      />
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "rgba(15,17,23,0.85)",
              color: "#d1d5db",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              pointerEvents: "all",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
            className="nodrag nopan"
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const TypedEdge = memo(TypedEdgeImpl);
TypedEdge.displayName = "TypedEdge";
