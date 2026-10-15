import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ImportedFont,
  Notebook,
  PageData,
  Stroke,
  TextBoxData,
  Tool,
  ToolSettings,
} from "../types";
import {
  BUILTIN_FONTS,
  DEFAULT_TOOLS,
  HIGHLIGHTER_COLORS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PEN_COLORS,
  TEXT_COLORS,
  blankPage,
  uid,
} from "../types";
import {
  IconAddPage,
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconAllPages,
  IconBlank,
  IconCover,
  IconDotted,
  IconDownload,
  IconEraser,
  IconFit,
  IconFont,
  IconHome,
  IconGrid,
  IconHighlighter,
  IconImage,
  IconLined,
  IconMinus,
  IconOnePage,
  IconPdf,
  IconPen,
  IconPlus,
  IconRedo,
  IconSelect,
  IconText,
  IconTrash,
  IconUndo,
  IconUpload,
  IconZoomIn,
  IconZoomOut,
} from "../icons";
import PageView from "./PageView";
import CoverPicker from "./CoverPicker";
import { pointerToPage } from "../utils/draw";
import { exportNotebookPdf } from "../utils/pdf";
import { coverStyle } from "../utils/cover";
import { loadCustomColors, saveCustomColors } from "../utils/storage";

interface Props {
  notebook: Notebook;
  fonts: ImportedFont[];
  onChange: (nb: Notebook) => void;
  onBack: () => void;
  onImportFont: (file: File) => Promise<void>;
}

type Snap = { pageId: string; strokes: Stroke[]; texts: TextBoxData[] };

export default function Editor({ notebook, fonts, onChange, onBack, onImportFont }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("pen");
  const [settings, setSettings] = useState<ToolSettings>(DEFAULT_TOOLS);
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [coverOpen, setCoverOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [bgScope, setBgScope] = useState<"one" | "all" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState(notebook.title);

  const pageRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const live = useRef<Stroke | null>(null);
  const colorInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingBg = useRef<string | null>(null);

  const pages = notebook.pages;
  const page = pages[pageIndex] ?? pages[0];

  useEffect(() => setTitle(notebook.title), [notebook.title, notebook.id]);

  useEffect(() => {
    saveCustomColors(customColors);
  }, [customColors]);

  useEffect(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const pad = 48;
      const z = Math.min((el.clientWidth - pad) / PAGE_WIDTH, (el.clientHeight - pad) / PAGE_HEIGHT);
      setZoom(Math.max(0.35, Math.min(1.4, z)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [notebook.id]);

  const patchNotebook = useCallback(
    (partial: Partial<Notebook> | ((nb: Notebook) => Notebook)) => {
      const next = typeof partial === "function" ? partial(notebook) : { ...notebook, ...partial };
      onChange({ ...next, updatedAt: Date.now() });
    },
    [notebook, onChange]
  );

  const patchPage = useCallback(
    (updater: (p: PageData) => PageData, index = pageIndex) => {
      patchNotebook((nb) => ({
        ...nb,
        pages: nb.pages.map((p, i) => (i === index ? updater(p) : p)),
      }));
    },
    [pageIndex, patchNotebook]
  );

  const snapshot = useCallback(() => {
    const p = notebook.pages[pageIndex];
    if (!p) return;
    undoStack.current.push({
      pageId: p.id,
      strokes: structuredClone(p.strokes),
      texts: structuredClone(p.texts),
    });
    if (undoStack.current.length > 80) undoStack.current.shift();
    redoStack.current = [];
  }, [notebook.pages, pageIndex]);

  const restore = (snap: Snap) => {
    patchNotebook((nb) => ({
      ...nb,
      pages: nb.pages.map((p) =>
        p.id === snap.pageId ? { ...p, strokes: snap.strokes, texts: snap.texts } : p
      ),
    }));
  };

  const undo = () => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    const p = notebook.pages.find((x) => x.id === snap.pageId);
    if (p) {
      redoStack.current.push({
        pageId: p.id,
        strokes: structuredClone(p.strokes),
        texts: structuredClone(p.texts),
      });
    }
    restore(snap);
    setSelectedTextId(null);
    setEditingTextId(null);
  };

  const redo = () => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    const p = notebook.pages.find((x) => x.id === snap.pageId);
    if (p) {
      undoStack.current.push({
        pageId: p.id,
        strokes: structuredClone(p.strokes),
        texts: structuredClone(p.texts),
      });
    }
    restore(snap);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        setEditingTextId(null);
        setSelectedTextId(null);
        setBgOpen(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedTextId && !editingTextId) {
        e.preventDefault();
        snapshot();
        patchPage((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== selectedTextId) }));
        setSelectedTextId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const palette = tool === "highlighter" ? HIGHLIGHTER_COLORS : tool === "text" ? TEXT_COLORS : PEN_COLORS;
  const activeColor =
    tool === "highlighter"
      ? settings.highlighter.color
      : tool === "text"
        ? settings.text.color
        : settings.pen.color;
  const activeSize =
    tool === "highlighter"
      ? settings.highlighter.size
      : tool === "eraser"
        ? settings.eraser.size
        : tool === "text"
          ? settings.text.size
          : settings.pen.size;

  const setColor = (color: string) => {
    if (tool === "highlighter") setSettings((s) => ({ ...s, highlighter: { ...s.highlighter, color } }));
    else if (tool === "text") {
      setSettings((s) => ({ ...s, text: { ...s.text, color } }));
      if (selectedTextId) patchPage((p) => ({ ...p, texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, color } : t)) }));
    } else setSettings((s) => ({ ...s, pen: { ...s.pen, color } }));
  };

  const setSize = (size: number) => {
    if (tool === "highlighter") setSettings((s) => ({ ...s, highlighter: { ...s.highlighter, size } }));
    else if (tool === "eraser") setSettings((s) => ({ ...s, eraser: { ...s.eraser, size } }));
    else if (tool === "text") {
      setSettings((s) => ({ ...s, text: { ...s.text, size } }));
      if (selectedTextId)
        patchPage((p) => ({
          ...p,
          texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, fontSize: size } : t)),
        }));
    } else setSettings((s) => ({ ...s, pen: { ...s.pen, size } }));
  };

  const handleSurface = (
    type: "down" | "move" | "up" | "click",
    e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-textbox]")) return;
    const surface = pageRef.current;
    if (!surface) return;

    if (type === "click") return;

    if (type === "down") {
      const pe = e as React.PointerEvent<HTMLDivElement>;
      if (typeof pe.button === "number" && pe.button !== 0) return;
      pe.preventDefault?.();

      if (tool === "select") {
        setSelectedTextId(null);
        setEditingTextId(null);
        return;
      }

      if (tool === "text") {
        if (editingTextId || selectedTextId) {
          setSelectedTextId(null);
          setEditingTextId(null);
          return;
        }
        const pos = pointerToPage(e, surface);
        snapshot();
        const box: TextBoxData = {
          id: uid(),
          x: Math.min(Math.max(8, pos.x), PAGE_WIDTH - 200),
          y: Math.min(Math.max(8, pos.y), PAGE_HEIGHT - 48),
          width: 280,
          height: Math.max(48, settings.text.size * 2.2),
          content: "",
          fontFamily: settings.text.fontFamily,
          fontSize: settings.text.size,
          color: settings.text.color,
          align: settings.text.align,
        };
        patchPage((p) => ({ ...p, texts: [...p.texts, box] }));
        setSelectedTextId(box.id);
        setEditingTextId(box.id);
        return;
      }

      drawing.current = true;
      (pe.currentTarget as HTMLElement).setPointerCapture?.(pe.pointerId);
      snapshot();
      const pos = pointerToPage(e, surface);
      const stroke: Stroke = {
        id: uid(),
        tool: tool === "eraser" ? "eraser" : tool === "highlighter" ? "highlighter" : "pen",
        points: [{ x: pos.x, y: pos.y, p: pe.pressure || 0.5 }],
        color: tool === "highlighter" ? settings.highlighter.color : settings.pen.color,
        size:
          tool === "eraser"
            ? settings.eraser.size
            : tool === "highlighter"
              ? settings.highlighter.size
              : settings.pen.size,
      };
      live.current = stroke;
      setLiveStroke({ ...stroke, points: [...stroke.points] });
      return;
    }

    if (type === "move" && drawing.current && live.current) {
      const pos = pointerToPage(e, surface);
      live.current.points.push({ x: pos.x, y: pos.y });
      setLiveStroke({ ...live.current, points: [...live.current.points] });
    } else if (type === "up" && drawing.current) {
      drawing.current = false;
      const s = live.current;
      live.current = null;
      setLiveStroke(null);
      if (s && s.points.length) {
        patchPage((p) => ({ ...p, strokes: [...p.strokes, s] }));
      }
    }
  };

  const addPage = () => {
    const p = blankPage();
    const bg = notebook.pages[pageIndex]?.background;
    if (bg) p.background = { ...bg };
    patchNotebook((nb) => ({ ...nb, pages: [...nb.pages, p] }));
    setPageIndex(notebook.pages.length);
    setSelectedTextId(null);
    setEditingTextId(null);
  };

  const deletePage = () => {
    if (notebook.pages.length <= 1) {
      snapshot();
      patchPage(() => blankPage());
      return;
    }
    const idx = pageIndex;
    patchNotebook((nb) => ({ ...nb, pages: nb.pages.filter((_, i) => i !== idx) }));
    setPageIndex(Math.max(0, idx - 1));
  };

  const applyBackgroundImage = (dataUrl: string, scope: "one" | "all") => {
    if (scope === "all") {
      patchNotebook((nb) => ({
        ...nb,
        pages: nb.pages.map((p) => ({ ...p, background: { ...p.background, image: dataUrl } })),
      }));
    } else {
      patchPage((p) => ({ ...p, background: { ...p.background, image: dataUrl } }));
    }
    setBgScope(null);
    setBgOpen(false);
  };

  const setPaperStyle = (style: PageData["background"]["style"], scope: "one" | "all" = "one") => {
    const apply = (p: PageData): PageData => ({
      ...p,
      background: { ...p.background, style, image: undefined },
    });
    if (scope === "all") patchNotebook((nb) => ({ ...nb, pages: nb.pages.map(apply) }));
    else patchPage(apply);
  };

  const doExport = async () => {
    setExporting(true);
    setEditingTextId(null);
    setSelectedTextId(null);
    try {
      await exportNotebookPdf(notebook, { includeCover: true });
    } catch (err) {
      console.warn(err);
    } finally {
      setExporting(false);
    }
  };

  const allFonts = useMemo(() => {
    const extra = fonts.map((f) => ({ name: f.name, label: f.name }));
    return [...BUILTIN_FONTS, ...extra];
  }, [fonts]);

  const sizeMin = tool === "eraser" ? 8 : tool === "highlighter" ? 8 : tool === "text" ? 10 : 0.8;
  const sizeMax = tool === "eraser" ? 72 : tool === "highlighter" ? 42 : tool === "text" ? 72 : 22;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#cfc6b8]" dir="rtl">
      <header className="z-20 flex items-center gap-2 px-3 py-2">
        <button className="tool-btn bg-white/70 shadow-sm" onClick={onBack} title="المكتبة">
          <IconHome />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => patchNotebook({ title: title.trim() || "بدون عنوان" })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-40 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-stone-900 outline-none backdrop-blur sm:w-56"
        />

        <div className="glass-bar mx-auto flex flex-wrap items-center gap-1 rounded-2xl px-2 py-1.5">
          <ToolBtn active={tool === "select"} onClick={() => setTool("select")} title="تحديد">
            <IconSelect size={18} />
          </ToolBtn>
          <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="قلم">
            <IconPen size={18} />
          </ToolBtn>
          <ToolBtn active={tool === "highlighter"} onClick={() => setTool("highlighter")} title="محدد">
            <IconHighlighter size={18} />
          </ToolBtn>
          <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="ممحاة">
            <IconEraser size={18} />
          </ToolBtn>
          <ToolBtn active={tool === "text"} onClick={() => setTool("text")} title="نص">
            <IconText size={18} />
          </ToolBtn>
          <span className="mx-1 h-5 w-px bg-stone-300" />
          <ToolBtn onClick={undo} title="تراجع">
            <IconUndo size={18} />
          </ToolBtn>
          <ToolBtn onClick={redo} title="إعادة">
            <IconRedo size={18} />
          </ToolBtn>
          <span className="mx-1 h-5 w-px bg-stone-300" />

          {tool !== "eraser" && (
            <div className="flex items-center gap-1.5 px-1">
              {palette.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${activeColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              {customColors.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${activeColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <button
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-stone-500 text-stone-700"
                title="لون إضافي"
                onClick={() => colorInput.current?.click()}
              >
                <IconPlus size={12} />
              </button>
              <input
                ref={colorInput}
                type="color"
                className="sr-only"
                onChange={(e) => {
                  const c = e.target.value;
                  setCustomColors((prev) => (prev.includes(c) ? prev : [...prev, c].slice(-10)));
                  setColor(c);
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 px-2">
            <span
              className="size-preview"
              style={{
                width: Math.min(18, 4 + activeSize * 0.5),
                height: Math.min(18, 4 + activeSize * 0.5),
                background: tool === "eraser" ? "#a8a29e" : activeColor,
                opacity: tool === "highlighter" ? 0.7 : 1,
              }}
            />
            <input
              type="range"
              min={sizeMin}
              max={sizeMax}
              step={tool === "pen" ? 0.2 : 1}
              value={activeSize}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-20"
            />
          </div>

          {tool === "text" && (
            <>
              <span className="mx-1 h-5 w-px bg-stone-300" />
              <select
                value={settings.text.fontFamily}
                onChange={(e) => {
                  const fontFamily = e.target.value;
                  setSettings((s) => ({ ...s, text: { ...s.text, fontFamily } }));
                  if (selectedTextId)
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, fontFamily } : t)),
                    }));
                }}
                className="max-w-[120px] rounded-lg bg-white/80 px-1 py-1 text-xs outline-none"
                style={{ fontFamily: settings.text.fontFamily }}
              >
                {allFonts.map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.label}
                  </option>
                ))}
              </select>
              <ToolBtn onClick={() => fontInput.current?.click()} title="استيراد خط">
                <IconFont size={18} />
              </ToolBtn>
              <input
                ref={fontInput}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportFont(file);
                  e.target.value = "";
                }}
              />
              <ToolBtn
                active={settings.text.align === "right"}
                onClick={() => {
                  setSettings((s) => ({ ...s, text: { ...s.text, align: "right" } }));
                  if (selectedTextId)
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, align: "right" } : t)),
                    }));
                }}
                title="يمين"
              >
                <IconAlignRight size={16} />
              </ToolBtn>
              <ToolBtn
                active={settings.text.align === "center"}
                onClick={() => {
                  setSettings((s) => ({ ...s, text: { ...s.text, align: "center" } }));
                  if (selectedTextId)
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, align: "center" } : t)),
                    }));
                }}
                title="وسط"
              >
                <IconAlignCenter size={16} />
              </ToolBtn>
              <ToolBtn
                active={settings.text.align === "left"}
                onClick={() => {
                  setSettings((s) => ({ ...s, text: { ...s.text, align: "left" } }));
                  if (selectedTextId)
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === selectedTextId ? { ...t, align: "left" } : t)),
                    }));
                }}
                title="يسار"
              >
                <IconAlignLeft size={16} />
              </ToolBtn>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button className="tool-btn bg-white/70 shadow-sm" title="خلفية" onClick={() => setBgOpen((v) => !v)}>
              <IconImage />
            </button>
            {bgOpen && (
              <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-2xl bg-[#faf7f2] p-3 shadow-xl">
                <div className="mb-2 flex justify-end gap-1">
                  <ToolBtn
                    active={page.background.style === "blank" && !page.background.image}
                    onClick={() => setPaperStyle("blank")}
                    title="فارغ"
                  >
                    <IconBlank size={18} />
                  </ToolBtn>
                  <ToolBtn
                    active={page.background.style === "lined" && !page.background.image}
                    onClick={() => setPaperStyle("lined")}
                    title="مسطر"
                  >
                    <IconLined size={18} />
                  </ToolBtn>
                  <ToolBtn
                    active={page.background.style === "grid" && !page.background.image}
                    onClick={() => setPaperStyle("grid")}
                    title="شبكة"
                  >
                    <IconGrid size={18} />
                  </ToolBtn>
                  <ToolBtn
                    active={page.background.style === "dotted" && !page.background.image}
                    onClick={() => setPaperStyle("dotted")}
                    title="نقاط"
                  >
                    <IconDotted size={18} />
                  </ToolBtn>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="tool-btn"
                    title="استيراد صورة"
                    onClick={() => bgInput.current?.click()}
                  >
                    <IconUpload size={18} />
                  </button>
                  <button
                    className={`tool-btn ${bgScope === "one" ? "active" : ""}`}
                    title="هذه الصفحة"
                    onClick={() => {
                      const img = pendingBg.current;
                      if (img) applyBackgroundImage(img, "one");
                      else setPaperStyle(page.background.style, "one");
                    }}
                  >
                    <IconOnePage size={18} />
                  </button>
                  <button
                    className={`tool-btn ${bgScope === "all" ? "active" : ""}`}
                    title="كل الصفحات"
                    onClick={() => {
                      const img = pendingBg.current;
                      if (img) applyBackgroundImage(img, "all");
                      else {
                        const bg = page.background;
                        patchNotebook((nb) => ({
                          ...nb,
                          pages: nb.pages.map((p) => ({ ...p, background: { ...bg } })),
                        }));
                      }
                    }}
                  >
                    <IconAllPages size={18} />
                  </button>
                </div>
                <input
                  ref={bgInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      pendingBg.current = String(reader.result);
                      setBgScope("one");
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
          <button className="tool-btn bg-white/70 shadow-sm" title="الغلاف" onClick={() => setCoverOpen(true)}>
            <IconCover />
          </button>
          <button
            className="tool-btn bg-white/70 shadow-sm"
            title="تصدير PDF"
            onClick={doExport}
            disabled={exporting}
          >
            {exporting ? <IconDownload /> : <IconPdf />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="scroll-thin flex w-[92px] flex-col items-center gap-3 overflow-auto py-3">
          <button
            className="relative h-[92px] w-[64px] overflow-hidden rounded-sm shadow-md ring-2 ring-transparent hover:ring-stone-500"
            style={coverStyle(notebook.cover)}
            onClick={() => setCoverOpen(true)}
            title="الغلاف"
          />
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setPageIndex(i);
                setSelectedTextId(null);
                setEditingTextId(null);
              }}
              className={`relative h-[92px] w-[64px] overflow-hidden rounded-sm bg-[#fffef9] shadow ${
                i === pageIndex ? "ring-2 ring-stone-900" : "ring-1 ring-stone-400/40"
              }`}
              style={{
                backgroundColor: p.background.color,
                backgroundImage: p.background.image ? `url(${p.background.image})` : undefined,
                backgroundSize: "cover",
              }}
            >
              <span className="absolute bottom-0 left-0 right-0 bg-black/40 text-center text-[10px] text-white">
                {i + 1}
              </span>
            </button>
          ))}
          <button className="tool-btn bg-white/80 shadow" onClick={addPage} title="صفحة جديدة">
            <IconAddPage />
          </button>
          <button className="tool-btn bg-white/80 text-red-700 shadow" onClick={deletePage} title="حذف الصفحة">
            <IconTrash size={18} />
          </button>
        </aside>

        <div ref={stageRef} className="scroll-thin relative flex min-w-0 flex-1 items-center justify-center overflow-auto p-6">
          <div
            style={{
              width: PAGE_WIDTH * zoom,
              height: PAGE_HEIGHT * zoom,
            }}
          >
            <div
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {page && (
                <PageView
                  ref={pageRef}
                  page={page}
                  liveStroke={liveStroke}
                  tool={tool}
                  scale={zoom}
                  selectedTextId={selectedTextId}
                  editingTextId={editingTextId}
                  onSurfaceEvent={handleSurface}
                  onTextSelect={(id) => {
                    setSelectedTextId(id);
                    setEditingTextId(null);
                    setTool((t) => (t === "pen" || t === "highlighter" || t === "eraser" ? t : "select"));
                  }}
                  onTextEdit={(id) => {
                    setSelectedTextId(id);
                    setEditingTextId(id);
                    setTool("text");
                  }}
                  onTextChange={(id, patch) => {
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
                    }));
                  }}
                  onTextCommit={(id, content) => {
                    patchPage((p) => ({
                      ...p,
                      texts: p.texts.map((t) => (t.id === id ? { ...t, content } : t)),
                    }));
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-2 py-2">
        <button className="tool-btn bg-white/70" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} title="تصغير">
          <IconZoomOut size={18} />
        </button>
        <button
          className="tool-btn bg-white/70"
          title="ملاءمة"
          onClick={() => {
            const el = stageRef.current;
            if (!el) return;
            const z = Math.min((el.clientWidth - 48) / PAGE_WIDTH, (el.clientHeight - 48) / PAGE_HEIGHT);
            setZoom(Math.max(0.35, Math.min(1.4, z)));
          }}
        >
          <IconFit size={18} />
        </button>
        <button className="tool-btn bg-white/70" onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} title="تكبير">
          <IconZoomIn size={18} />
        </button>
        <button
          className="tool-btn bg-white/70"
          disabled={pageIndex === 0}
          onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
        >
          <IconMinus size={16} />
        </button>
        <span className="min-w-16 text-center text-xs text-stone-700">
          {pageIndex + 1} / {pages.length}
        </span>
        <button
          className="tool-btn bg-white/70"
          disabled={pageIndex >= pages.length - 1}
          onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
        >
          <IconPlus size={16} />
        </button>
      </footer>

      {coverOpen && (
        <CoverPicker
          value={notebook.cover}
          onChange={(cover) => patchNotebook({ cover })}
          onClose={() => setCoverOpen(false)}
        />
      )}

      {exporting && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-xl">
            <IconDownload />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button className={`tool-btn ${active ? "active" : ""}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
