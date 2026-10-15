import jsPDF from "jspdf";
import type { Notebook, PageData, TextBoxData } from "../types";
import { COVER_TEMPLATES, PAGE_HEIGHT, PAGE_WIDTH } from "../types";
import { drawStrokes } from "./draw";

function coverSrc(notebook: Notebook): string | null {
  if (notebook.cover.type === "template") {
    const id = notebook.cover.id;
    const t = COVER_TEMPLATES.find((c) => c.id === id);
    return t?.src ?? null;
  }
  if (notebook.cover.type === "image") return notebook.cover.dataUrl;
  return null;
}

export async function exportNotebookPdf(
  notebook: Notebook,
  options?: { includeCover?: boolean }
): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let added = 0;

  if (options?.includeCover !== false) {
    const src = coverSrc(notebook);
    if (src) {
      const img = await loadImage(src);
      const data = imageToJpeg(img);
      pdf.addImage(data, "JPEG", 0, 0, 210, 297);
      added++;
    } else if (notebook.cover.type === "color") {
      pdf.setFillColor(notebook.cover.value);
      pdf.rect(0, 0, 210, 297, "F");
      added++;
    }
  }

  for (const page of notebook.pages) {
    const canvas = await renderPage(page);
    const data = canvas.toDataURL("image/jpeg", 0.93);
    if (added > 0) pdf.addPage();
    pdf.addImage(data, "JPEG", 0, 0, 210, 297);
    added++;
  }

  const safe = notebook.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "StarNote";
  pdf.save(`${safe}.pdf`);
}

async function renderPage(page: PageData): Promise<HTMLCanvasElement> {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * scale;
  canvas.height = PAGE_HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.fillStyle = page.background.color || "#fffef9";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  if (page.background.image) {
    try {
      const img = await loadImage(page.background.image);
      ctx.drawImage(img, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    } catch {
      /* keep color */
    }
  } else {
    paintPaper(ctx, page.background.style);
  }

  const ink = document.createElement("canvas");
  ink.width = canvas.width;
  ink.height = canvas.height;
  const ictx = ink.getContext("2d");
  if (ictx) {
    ictx.setTransform(scale, 0, 0, scale, 0, 0);
    drawStrokes(ictx, page.strokes, null, { clear: false });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(ink, 0, 0);
    ctx.restore();
  }

  for (const t of page.texts) {
    paintText(ctx, t);
  }

  return canvas;
}

function paintPaper(ctx: CanvasRenderingContext2D, style: PageData["background"]["style"]) {
  ctx.save();
  ctx.strokeStyle = "#d7d0c4";
  ctx.fillStyle = "#c9c2b4";
  ctx.lineWidth = 1;
  if (style === "lined") {
    for (let y = 48; y < PAGE_HEIGHT; y += 28) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(PAGE_WIDTH - 24, y);
      ctx.stroke();
    }
  } else if (style === "grid") {
    for (let y = 0; y < PAGE_HEIGHT; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PAGE_WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x < PAGE_WIDTH; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PAGE_HEIGHT);
      ctx.stroke();
    }
  } else if (style === "dotted") {
    for (let y = 11; y < PAGE_HEIGHT; y += 22) {
      for (let x = 11; x < PAGE_WIDTH; x += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function paintText(ctx: CanvasRenderingContext2D, t: TextBoxData) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(t.x, t.y, t.width, t.height);
  ctx.clip();
  ctx.font = `${t.fontSize}px "${t.fontFamily}", Cairo, sans-serif`;
  ctx.fillStyle = t.color;
  ctx.textBaseline = "top";
  ctx.direction = "inherit";
  const pad = 8;
  const maxW = Math.max(20, t.width - pad * 2);
  const lines = wrapLines(ctx, t.content || "", maxW);
  const lh = t.fontSize * 1.5;
  let x = t.x + pad;
  if (t.align === "right") {
    ctx.textAlign = "right";
    x = t.x + t.width - pad;
  } else if (t.align === "center") {
    ctx.textAlign = "center";
    x = t.x + t.width / 2;
  } else {
    ctx.textAlign = "left";
  }
  let y = t.y + 6;
  for (const line of lines) {
    if (y > t.y + t.height) break;
    ctx.fillText(line, x, y, maxW);
    y += lh;
  }
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      out.push("");
      continue;
    }
    const words = para.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imageToJpeg(img: HTMLImageElement): string {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.92);
}
