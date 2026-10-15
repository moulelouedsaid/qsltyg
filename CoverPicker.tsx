import { useRef } from "react";
import type { Cover } from "../types";
import { COVER_TEMPLATES, SOLID_COVERS } from "../types";
import { IconCheck, IconClose, IconUpload } from "../icons";
import { coverUrl } from "../utils/cover";

interface Props {
  value: Cover;
  onChange: (cover: Cover) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function CoverGrid({ value, onChange }: { value: Cover; onChange: (c: Cover) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isTemplate = (id: string) => value.type === "template" && value.id === id;
  const isColor = (c: string) => value.type === "color" && value.value === c;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {COVER_TEMPLATES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange({ type: "template", id: c.id })}
            className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-md transition hover:scale-[1.03]"
            style={{ boxShadow: isTemplate(c.id) ? "0 0 0 3px #1c1917" : undefined }}
          >
            <img src={c.src} alt="" className="h-full w-full object-cover" />
            {isTemplate(c.id) && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                <IconCheck size={20} />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {SOLID_COVERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ type: "color", value: c })}
            className="color-swatch h-9 w-9"
            style={{
              background: c,
              boxShadow: isColor(c) ? "0 0 0 2px #fff, 0 0 0 4px #1c1917" : undefined,
            }}
          />
        ))}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-stone-400 text-stone-600 hover:bg-stone-200"
          onClick={() => fileRef.current?.click()}
          title="رفع غلاف"
        >
          <IconUpload size={16} />
        </button>
        {value.type === "image" && (
          <div
            className="h-9 w-7 overflow-hidden rounded-sm shadow"
            style={{ boxShadow: "0 0 0 2px #fff, 0 0 0 4px #1c1917" }}
          >
            <img src={coverUrl(value) ?? ""} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange({ type: "image", dataUrl: String(reader.result) });
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default function CoverPicker({ value, onChange, onClose, embedded }: Props) {
  if (embedded) {
    return <CoverGrid value={value} onChange={onChange} />;
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="fade-up w-full max-w-2xl rounded-3xl bg-[#faf7f2] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <button className="tool-btn" onClick={onClose} title="إغلاق">
            <IconClose />
          </button>
          <span className="text-lg font-semibold text-[#1c1917]">الغلاف</span>
        </div>
        <CoverGrid value={value} onChange={onChange} />
      </div>
    </div>
  );
}
