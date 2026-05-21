import {
  Zap,
  Database,
  Lightbulb,
  GitBranch,
  Code2,
  StickyNote,
  User,
  type LucideIcon,
} from "lucide-react";
import type { NodeType, EdgeType } from "../types";

export interface NodeTheme {
  icon: LucideIcon;
  ring: string;
  bg: string;
  accent: string;
}

export const NODE_THEME: Record<NodeType, NodeTheme> = {
  action: {
    icon: Zap,
    ring: "ring-blue-500/40",
    bg: "bg-blue-950/40",
    accent: "text-blue-300",
  },
  data: {
    icon: Database,
    ring: "ring-amber-500/40",
    bg: "bg-amber-950/40",
    accent: "text-amber-300",
  },
  concept: {
    icon: Lightbulb,
    ring: "ring-purple-500/40",
    bg: "bg-purple-950/40",
    accent: "text-purple-300",
  },
  decision: {
    icon: GitBranch,
    ring: "ring-yellow-500/40",
    bg: "bg-yellow-950/40",
    accent: "text-yellow-300",
  },
  code: {
    icon: Code2,
    ring: "ring-gray-500/40",
    bg: "bg-gray-900/60",
    accent: "text-gray-300",
  },
  note: {
    icon: StickyNote,
    ring: "ring-stone-500/40",
    bg: "bg-stone-900/60",
    accent: "text-stone-300",
  },
  actor: {
    icon: User,
    ring: "ring-indigo-500/40",
    bg: "bg-indigo-950/40",
    accent: "text-indigo-300",
  },
};

export interface EdgeTheme {
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  animated: boolean;
}

export const EDGE_THEME: Record<EdgeType, EdgeTheme> = {
  request: { stroke: "#60a5fa", strokeWidth: 1.5, dashed: false, animated: false },
  data: { stroke: "#fbbf24", strokeWidth: 1.5, dashed: true, animated: true },
  causes: { stroke: "#9ca3af", strokeWidth: 1.5, dashed: false, animated: false },
  "depends-on": { stroke: "#9ca3af", strokeWidth: 1.5, dashed: true, animated: false },
  bidirectional: { stroke: "#a78bfa", strokeWidth: 1.5, dashed: false, animated: false },
};
