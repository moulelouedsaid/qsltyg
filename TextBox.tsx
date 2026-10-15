import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TextBoxData } from "../types";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Props {
  data: TextBoxData;
  selected: boolean;
  editing: boolean;
  scale: number;
  onSelect: () => void;
  onStartEdit: () => void;
  onChange: (patch: Partial<TextBoxData>) => void;
  onCommitContent: (content: string) => void;
  onMoveEnd: (x: number, y: number) => void;
}

const MIN_W = 80;
const MIN_H = 36;

export default function TextBox({
  data,
  selected,
  editing,
  scale,
  onSelect,
  onStartEdit,
  onChange,
  onCommitContent,
  onMoveEnd,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<{ l: number; t: number; h: number } | null>(null);
  const drag = useRef<{
    kind: "move" | Handle;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (editing && editRef.current) {
      if (editRef.current.textContent !== data.content) {
        editRef.current.textContent = data.content;
      }
      editRef.current.focus();
      placeCaretAtEnd(editRef.current);
      requestAnimationFrame(updateCaret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const updateCaret = useCallback(() => {
    if (!editing || !editRef.current || !boxRef.current) {
      setCaret(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editRef.current.contains(range.startContainer)) return;

    const clone = range.cloneRange();
    let rect: DOMRect | null = null;
    if (clone.collapsed) {
      const marker = document.createElement("span");
      marker.textContent = "\u200b";
      clone.insertNode(marker);
      rect = marker.getBoundingClientRect();
      const parent = marker.parentNode;
      parent?.removeChild(marker);
      parent?.normalize();
    } else {
      rect = clone.getBoundingClientRect();
    }
    if (!rect) return;
    const box = boxRef.current.getBoundingClientRect();
    setCaret({
      l: rect.left - box.left,
      t: rect.top - box.top,
      h: Math.max(rect.height || data.fontSize * 1.4, data.fontSize * 0.9),
    });
  }, [editing, data.fontSize]);

  useEffect(() => {
    if (!editing) {
      setCaret(null);
      return;
    }
    const el = editRef.current;
    if (!el) return;
    const handler = () => requestAnimationFrame(updateCaret);
    document.addEventListener("selectionchange", handler);
    el.addEventListener("keyup", handler);
    el.addEventListener("pointerup", handler);
    el.addEventListener("input", handler);
    handler();
    return () => {
      document.removeEventListener("selectionchange", handler);
      el.removeEventListener("keyup", handler);
      el.removeEventListener("pointerup", handler);
      el.removeEventListener("input", handler);
    };
  }, [editing, updateCaret]);

  const onPointerDown = (e: React.PointerEvent, kind: "move" | Handle) => {
    if (editing && kind === "move") return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      kind,
      sx: e.clientX,
      sy: e.clientY,
      ox: data.x,
      oy: data.y,
      ow: data.width,
      oh: data.height,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.kind === "move") {
      onChange({ x: d.ox + dx, y: d.oy + dy });
      return;
    }
    let x = d.ox;
    let y = d.oy;
    let w = d.ow;
    let h = d.oh;
    const k = d.kind;
    if (k.includes("e")) w = Math.max(MIN_W, d.ow + dx);
    if (k.includes("s")) h = Math.max(MIN_H, d.oh + dy);
    if (k.includes("w")) {
      w = Math.max(MIN_W, d.ow - dx);
      x = d.ox + (d.ow - w);
    }
    if (k.includes("n")) {
      h = Math.max(MIN_H, d.oh - dy);
      y = d.oy + (d.oh - h);
    }
    onChange({ x, y, width: w, height: h });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onMoveEnd(data.x, data.y);
  };

  const handles: { k: Handle; style: React.CSSProperties; cursor: string }[] = [
    { k: "nw", style: { left: -5, top: -5 }, cursor: "nwse-resize" },
    { k: "n", style: { left: "50%", top: -5, transform: "translateX(-50%)" }, cursor: "ns-resize" },
    { k: "ne", style: { right: -5, top: -5 }, cursor: "nesw-resize" },
    { k: "e", style: { right: -5, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
    { k: "se", style: { right: -5, bottom: -5 }, cursor: "nwse-resize" },
    { k: "s", style: { left: "50%", bottom: -5, transform: "translateX(-50%)" }, cursor: "ns-resize" },
    { k: "sw", style: { left: -5, bottom: -5 }, cursor: "nesw-resize" },
    { k: "w", style: { left: -5, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
  ];

  return (
    <div
      ref={boxRef}
      data-textbox={data.id}
      className="absolute"
      style={{
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        zIndex: editing ? 30 : selected ? 20 : 10,
        cursor: editing ? "text" : selected ? "move" : "default",
      }}
      onPointerDown={(e) => {
        if (editing) {
          e.stopPropagation();
          return;
        }
        onPointerDown(e, "move");
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStartEdit();
      }}
    >
      <div
        className="h-full w-full overflow-hidden"
        style={{
          border: selected || editing ? "1.5px solid #2563eb" : "1.5px solid transparent",
          background: selected || editing ? "rgba(37,99,235,0.04)" : "transparent",
          borderRadius: 2,
        }}
      >
        {editing ? (
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            dir="auto"
            className="h-full w-full overflow-auto px-2 py-1 outline-none"
            style={{
              fontFamily: data.fontFamily,
              fontSize: data.fontSize,
              color: data.color,
              textAlign: data.align,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              caretColor: "transparent",
              userSelect: "text",
            }}
            onInput={(e) => {
              onCommitContent((e.currentTarget.textContent ?? "").replace(/\u200b/g, ""));
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            dir="auto"
            className="h-full w-full overflow-hidden px-2 py-1"
            style={{
              fontFamily: data.fontFamily,
              fontSize: data.fontSize,
              color: data.color,
              textAlign: data.align,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {data.content}
          </div>
        )}
      </div>

      {editing && caret && (
        <div
          className="blue-caret"
          ref={caretRef}
          style={{
            left: caret.l,
            top: caret.t,
            height: caret.h,
          }}
        />
      )}

      {(selected || editing) &&
        handles.map((h) => (
          <div
            key={h.k}
            className="resize-handle"
            style={{ ...h.style, cursor: h.cursor }}
            onPointerDown={(e) => onPointerDown(e, h.k)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        ))}
    </div>
  );
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
