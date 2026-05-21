export type NodeType = "action" | "data" | "concept" | "decision" | "code" | "note" | "actor";
export type EdgeType = "request" | "data" | "causes" | "depends-on" | "bidirectional";

export interface DiagramGroup {
  id: string;
  label: string;
  color?: string;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  content?: string;
  group?: string;
  position: { x: number; y: number };
  style?: { color?: string; icon?: string };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: EdgeType;
  style?: { color?: string; dashed?: boolean };
}

export interface Diagram {
  id: string;
  title: string;
  description?: string;
  schema_version: 1;
  template_id?: string;
  created_at?: string;
  updated_at?: string;
  layout_hint?: string;
  groups?: DiagramGroup[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramPreview {
  id: string;
  title: string;
  description?: string;
  updated_at?: string;
  template_id?: string;
}

export interface TemplateEntry {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  source: "default" | "user";
  created_at?: string;
}
