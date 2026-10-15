import type { CSSProperties } from "react";
import type { Cover, Notebook } from "../types";
import { COVER_TEMPLATES } from "../types";

export function coverUrl(cover: Cover): string | null {
  if (cover.type === "template") {
    return COVER_TEMPLATES.find((c) => c.id === cover.id)?.src ?? null;
  }
  if (cover.type === "image") return cover.dataUrl;
  return null;
}

export function coverStyle(cover: Cover): CSSProperties {
  if (cover.type === "color") {
    return { background: cover.value };
  }
  const src = coverUrl(cover);
  if (src) {
    return {
      backgroundImage: `url(${src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: "#1c1917" };
}

export function notebookCoverStyle(nb: Notebook): CSSProperties {
  return coverStyle(nb.cover);
}
