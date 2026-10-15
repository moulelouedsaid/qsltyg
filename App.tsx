import { useCallback, useEffect, useState } from "react";
import type { ImportedFont, Notebook } from "./types";
import { uid } from "./types";
import { loadFonts, loadNotebooks, saveFonts, saveNotebooks } from "./utils/storage";
import { setupPwa } from "./utils/appDownload";
import Library from "./components/Library";
import Editor from "./components/Editor";

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => loadNotebooks());
  const [fonts, setFonts] = useState<ImportedFont[]>(() => loadFonts());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    setupPwa();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => saveNotebooks(notebooks), 280);
    return () => window.clearTimeout(t);
  }, [notebooks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const f of fonts) {
        try {
          const face = new FontFace(f.name, `url(${f.dataUrl})`);
          await face.load();
          document.fonts.add(face);
        } catch {
          /* skip broken font */
        }
      }
      if (!cancelled) setFontsReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsert = useCallback((nb: Notebook) => {
    setNotebooks((list) => {
      const i = list.findIndex((x) => x.id === nb.id);
      if (i === -1) return [nb, ...list];
      const next = [...list];
      next[i] = nb;
      return next;
    });
  }, []);

  const importFont = useCallback(async (file: File) => {
    const dataUrl = await readFile(file);
    const name = uniqueFontName(file.name.replace(/\.[^.]+$/, ""), fonts);
    try {
      const face = new FontFace(name, `url(${dataUrl})`);
      await face.load();
      document.fonts.add(face);
      const item: ImportedFont = { id: uid(), name, dataUrl };
      setFonts((prev) => {
        const next = [...prev, item];
        saveFonts(next);
        return next;
      });
    } catch (e) {
      console.warn("Font import failed", e);
    }
  }, [fonts]);

  const active = notebooks.find((n) => n.id === activeId) ?? null;

  if (!fontsReady && fonts.length > 0) {
    return <div className="h-full bg-[#cfc6b8]" />;
  }

  if (active) {
    return (
      <Editor
        notebook={active}
        fonts={fonts}
        onChange={upsert}
        onBack={() => setActiveId(null)}
        onImportFont={importFont}
      />
    );
  }

  return (
    <Library
      notebooks={notebooks}
      onOpen={setActiveId}
      onCreate={(nb) => {
        upsert(nb);
      }}
      onDelete={(id) => setNotebooks((list) => list.filter((n) => n.id !== id))}
      onUpdate={upsert}
    />
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function uniqueFontName(base: string, existing: ImportedFont[]) {
  const names = new Set(existing.map((f) => f.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
