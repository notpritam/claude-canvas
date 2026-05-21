import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  type TLBaseShape,
  type RecordProps,
} from "tldraw";
import { T } from "@tldraw/validate";
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
import type { NodeType } from "../types";

// ---------------------------------------------------------------------------
// Module augmentation — registers 'card' with tldraw's type system
// ---------------------------------------------------------------------------

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    card: {
      w: number;
      h: number;
      nodeType: NodeType;
      label: string;
      content?: string;
    };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 240;
const CARD_H = 110;

const NODE_THEME: Record<
  NodeType,
  { icon: LucideIcon; bg: string; stroke: string; accent: string }
> = {
  action:   { icon: Zap,        bg: "#1e40af", stroke: "#60a5fa", accent: "#bfdbfe" },
  data:     { icon: Database,   bg: "#92400e", stroke: "#fbbf24", accent: "#fde68a" },
  concept:  { icon: Lightbulb,  bg: "#6b21a8", stroke: "#c084fc", accent: "#e9d5ff" },
  decision: { icon: GitBranch,  bg: "#854d0e", stroke: "#facc15", accent: "#fef08a" },
  code:     { icon: Code2,      bg: "#334155", stroke: "#94a3b8", accent: "#e2e8f0" },
  note:     { icon: StickyNote, bg: "#9f1239", stroke: "#fb7185", accent: "#fecdd3" },
  actor:    { icon: User,       bg: "#3730a3", stroke: "#818cf8", accent: "#c7d2fe" },
};

// ---------------------------------------------------------------------------
// CardShape type
// ---------------------------------------------------------------------------

export type CardShape = TLBaseShape<
  "card",
  {
    w: number;
    h: number;
    nodeType: NodeType;
    label: string;
    content?: string;
  }
>;

// ---------------------------------------------------------------------------
// CardShapeUtil
// ---------------------------------------------------------------------------

export class CardShapeUtil extends ShapeUtil<CardShape> {
  static override type = "card" as const;
  static override props: RecordProps<CardShape> = {
    w: T.number,
    h: T.number,
    nodeType: T.literalEnum(
      "action",
      "data",
      "concept",
      "decision",
      "code",
      "note",
      "actor"
    ),
    label: T.string,
    content: T.optional(T.string),
  };

  override getDefaultProps(): CardShape["props"] {
    return {
      w: CARD_W,
      h: CARD_H,
      nodeType: "action",
      label: "New",
      content: undefined,
    };
  }

  override canEdit(): boolean {
    return true;
  }

  override canResize(): boolean {
    return true;
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  override getGeometry(shape: CardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  // v5: getIndicatorPath replaces indicator() — return a rounded-rect Path2D
  override getIndicatorPath(shape: CardShape): Path2D {
    const { w, h } = shape.props;
    const r = 10;
    const path = new Path2D();
    path.moveTo(r, 0);
    path.lineTo(w - r, 0);
    path.arcTo(w, 0, w, r, r);
    path.lineTo(w, h - r);
    path.arcTo(w, h, w - r, h, r);
    path.lineTo(r, h);
    path.arcTo(0, h, 0, h - r, r);
    path.lineTo(0, r);
    path.arcTo(0, 0, r, 0, r);
    path.closePath();
    return path;
  }

  override component(shape: CardShape) {
    const theme = NODE_THEME[shape.props.nodeType];
    const Icon = theme.icon;
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          background: theme.bg,
          border: `1.5px solid ${theme.stroke}`,
          borderRadius: 10,
          padding: "14px 16px",
          pointerEvents: "all",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          color: "#ffffff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={12} color={theme.accent} />
          <span
            style={{
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: theme.accent,
              fontWeight: 600,
            }}
          >
            {shape.props.nodeType}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, color: "#ffffff" }}>
          {shape.props.label}
        </div>
        {shape.props.content && (
          <div
            style={{
              fontSize: 10.5,
              color: "#cbd5e1",
              lineHeight: 1.4,
              overflow: "hidden",
            }}
          >
            {shape.props.content}
          </div>
        )}
      </HTMLContainer>
    );
  }

  override getText(shape: CardShape): string {
    return shape.props.label;
  }

  override onEditEnd(_shape: CardShape): void {
    // no-op — tldraw handles label updates via updateShape internally
  }
}
