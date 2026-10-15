import { forwardRef, useEffect, useRef } from "react";
import type { PageData, Stroke, TextBoxData, Tool } from "../types";
import { DPR, PAGE_HEIGHT, PAGE_WIDTH } from "../types";
import { drawStrokes } from "../utils/draw";
import TextBox from "./TextBox";

interface Props {
  page: PageData;
  liveStroke?: Stroke | null;
  tool: Tool;
  scale: number;
  selectedTextId: string | null;
  editingTextId: string | null;
  preview?: boolean;
  onSurfaceEvent?: (
    type: "down" | "move" | "up" | "click",
    e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) => void;
  onTextSelect: (id: string) => void;
  onTextEdit: (id: string) => void;
  onTextChange: (id: string, patch: Partial<TextBoxData>) => void;
  onTextCommit: (id: string, content: string) => void;
}

const PageView = forwardRef<HTMLDivElement, Props>(function PageView(
  {
    page,
    liveStroke,
    tool,
    scale,
    selectedTextId,
    editingTextId,
    preview,
    onSurfaceEvent,
    onTextSelect,
    onTextEdit,
    onTextChange,
    onTextCommit,
  },
  ref
) {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = inkRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    setup(c, ctx);
    drawStrokes(ctx, page.strokes);
  }, [page.strokes]);

  useEffect(() => {
    const c = liveRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    setup(c, ctx);
    if (liveStroke) drawStrokes(ctx, [], liveStroke);
    else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.restore();
    }
  }, [liveStroke]);

  const bgClass =
    !page.background.image && page.background.style === "lined"
      ? "paper-lined"
      : !page.background.image && page.background.style === "grid"
        ? "paper-grid"
        : !page.background.image && page.background.style === "dotted"
          ? "paper-dotted"
          : "";

  const cursor =
    tool === "pen" || tool === "highlighter"
      ? "crosshair"
      : tool === "eraser"
        ? "cell"
        : tool === "text"
          ? "text"
          : "default";

  return (
    <div
      ref={ref}
      data-page={page.id}
      className={`page-shadow no-select relative overflow-hidden bg-white ${bgClass}`}
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        backgroundColor: page.background.color || "#fffef9",
        backgroundImage: page.background.image ? `url(${page.background.image})` : undefined,
        backgroundSize: page.background.image ? "cover" : undefined,
        backgroundPosition: "center",
        cursor,
        touchAction: "none",
      }}
      onPointerDown={(e) => onSurfaceEvent?.("down", e)}
      onPointerMove={(e) => onSurfaceEvent?.("move", e)}
      onPointerUp={(e) => onSurfaceEvent?.("up", e)}
      onPointerCancel={(e) => onSurfaceEvent?.("up", e)}
      onClick={(e) => onSurfaceEvent?.("click", e)}
    >
      <canvas
        ref={inkRef}
        className="page-canvas pointer-events-none absolute inset-0"
        width={PAGE_WIDTH * DPR}
        height={PAGE_HEIGHT * DPR}
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
      />
      <canvas
        ref={liveRef}
        className="page-canvas pointer-events-none absolute inset-0"
        width={PAGE_WIDTH * DPR}
        height={PAGE_HEIGHT * DPR}
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
      />

      {page.texts.map((t) => (
        <TextBox
          key={t.id}
          data={t}
          selected={!preview && selectedTextId === t.id}
          editing={!preview && editingTextId === t.id}
          scale={scale}
          onSelect={() => onTextSelect(t.id)}
          onStartEdit={() => onTextEdit(t.id)}
          onChange={(patch) => onTextChange(t.id, patch)}
          onCommitContent={(content) => onTextCommit(t.id, content)}
          onMoveEnd={() => {}}
        />
      ))}
    </div>
  );
});

function setup(_canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

export default PageView;
