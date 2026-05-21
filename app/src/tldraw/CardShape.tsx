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

const CARD_W = 220;
const CARD_H = 96;

const NODE_THEME: Record<
  NodeType,
  { icon: LucideIcon; bg: string; stroke: string; accent: string }
> = {
  action:   { icon: Zap,        bg: "#1e3a8a40", stroke: "#3b82f6", accent: "#93c5fd" },
  data:     { icon: Database,   bg: "#78350f40", stroke: "#d97706", accent: "#fcd34d" },
  concept:  { icon: Lightbulb,  bg: "#581c8740", stroke: "#9333ea", accent: "#d8b4fe" },
  decision: { icon: GitBranch,  bg: "#713f1240", stroke: "#ca8a04", accent: "#fde047" },
  code:     { icon: Code2,      bg: "#1f293760", stroke: "#6b7280", accent: "#d1d5db" },
  note:     { icon: StickyNote, bg: "#7f1d1d40", stroke: "#dc2626", accent: "#fca5a5" },
  actor:    { icon: User,       bg: "#3730a340", stroke: "#4f46e5", accent: "#a5b4fc" },
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
          padding: 10,
          pointerEvents: "all",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          color: "#e5e7eb",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={13} color={theme.accent} />
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#9ca3af",
            }}
          >
            {shape.props.nodeType}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>
          {shape.props.label}
        </div>
        {shape.props.content && (
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
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
