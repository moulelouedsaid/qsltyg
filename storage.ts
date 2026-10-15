import type { ImportedFont, Notebook } from "../types";

const NB_KEY = "starnote.notebooks.v1";
const FONT_KEY = "starnote.fonts.v1";
const TOOL_KEY = "starnote.tools.v1";
const COLOR_KEY = "starnote.customColors.v1";

export function loadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(NB_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Notebook[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveNotebooks(notebooks: Notebook[]) {
  try {
    localStorage.setItem(NB_KEY, JSON.stringify(notebooks));
  } catch (e) {
    console.warn("Failed to save notebooks", e);
  }
}

export function loadFonts(): ImportedFont[] {
  try {
    const raw = localStorage.getItem(FONT_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ImportedFont[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveFonts(fonts: ImportedFont[]) {
  try {
    localStorage.setItem(FONT_KEY, JSON.stringify(fonts));
  } catch (e) {
    console.warn("Failed to save fonts", e);
  }
}

export function loadCustomColors(): string[] {
  try {
    const raw = localStorage.getItem(COLOR_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as string[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveCustomColors(colors: string[]) {
  try {
    localStorage.setItem(COLOR_KEY, JSON.stringify(colors));
  } catch {
    /* ignore */
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export { TOOL_KEY };
