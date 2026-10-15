export type Tool = "select" | "pen" | "highlighter" | "eraser" | "text";

export type PaperStyle = "blank" | "lined" | "grid" | "dotted";

export interface Point {
  x: number;
  y: number;
  p?: number;
}

export interface Stroke {
  id: string;
  tool: "pen" | "highlighter" | "eraser";
  points: Point[];
  color: string;
  size: number;
}

export interface TextBoxData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: "right" | "left" | "center";
}

export interface PageBackground {
  style: PaperStyle;
  color: string;
  image?: string;
}

export interface PageData {
  id: string;
  strokes: Stroke[];
  texts: TextBoxData[];
  background: PageBackground;
}

export type Cover =
  | { type: "template"; id: string }
  | { type: "image"; dataUrl: string }
  | { type: "color"; value: string };

export interface Notebook {
  id: string;
  title: string;
  cover: Cover;
  pages: PageData[];
  createdAt: number;
  updatedAt: number;
}

export interface ImportedFont {
  id: string;
  name: string;
  dataUrl: string;
}

export interface ToolSettings {
  pen: { color: string; size: number };
  highlighter: { color: string; size: number };
  eraser: { size: number };
  text: { color: string; size: number; fontFamily: string; align: "right" | "left" | "center" };
}

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const DPR = 2;

export { COVER_TEMPLATES } from "./covers";

export const SOLID_COVERS = [
  "#1c1917",
  "#1e3a5f",
  "#14532d",
  "#7f1d1d",
  "#4a1d6a",
  "#9a3412",
  "#0f766e",
  "#44403c",
];

export const PEN_COLORS = [
  "#1c1917",
  "#44403c",
  "#b91c1c",
  "#1d4ed8",
  "#15803d",
  "#7c2d12",
  "#6d28d9",
  "#0f766e",
];

export const HIGHLIGHTER_COLORS = [
  "#fde047",
  "#86efac",
  "#fda4af",
  "#93c5fd",
  "#fdba74",
  "#d8b4fe",
  "#67e8f9",
  "#f9a8d4",
];

export const TEXT_COLORS = [
  "#1c1917",
  "#b91c1c",
  "#1d4ed8",
  "#15803d",
  "#7c2d12",
  "#6d28d9",
  "#0f766e",
  "#9f1239",
];

export const BUILTIN_FONTS = [
  { name: "Cairo", label: "Cairo" },
  { name: "Tajawal", label: "Tajawal" },
  { name: "Amiri", label: "Amiri" },
  { name: "Noto Naskh Arabic", label: "Naskh" },
  { name: "Noto Sans Arabic", label: "Sans Arabic" },
  { name: "Scheherazade New", label: "Scheherazade" },
  { name: "Aref Ruqaa", label: "Ruqaa" },
  { name: "Lateef", label: "Lateef" },
  { name: "IBM Plex Sans Arabic", label: "IBM Plex" },
  { name: "Inter", label: "Inter" },
  { name: "Roboto", label: "Roboto" },
  { name: "Merriweather", label: "Merriweather" },
  { name: "Playfair Display", label: "Playfair" },
  { name: "Dancing Script", label: "Dancing" },
  { name: "Pacifico", label: "Pacifico" },
];

export const DEFAULT_BACKGROUND: PageBackground = {
  style: "blank",
  color: "#fffef9",
};

export const DEFAULT_TOOLS: ToolSettings = {
  pen: { color: "#1c1917", size: 2.5 },
  highlighter: { color: "#fde047", size: 16 },
  eraser: { size: 24 },
  text: { color: "#1c1917", size: 18, fontFamily: "Cairo", align: "right" },
};

export function blankPage(): PageData {
  return {
    id: uid(),
    strokes: [],
    texts: [],
    background: { ...DEFAULT_BACKGROUND },
  };
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
