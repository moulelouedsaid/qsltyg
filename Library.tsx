import { useMemo, useState } from "react";
import type { Cover, Notebook } from "../types";
import { blankPage, uid } from "../types";
import { notebookCoverStyle } from "../utils/cover";
import CoverPicker from "./CoverPicker";
import { exportNotebookPdf } from "../utils/pdf";
import {
  canInstallNative,
  downloadAppToDevice,
  getAppIcon,
  installNative,
} from "../utils/appDownload";
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconCover,
  IconClose,
  IconDownload,
  IconPdf,
  IconCheck,
} from "../icons";

interface Props {
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: (nb: Notebook) => void;
  onDelete: (id: string) => void;
  onUpdate: (nb: Notebook) => void;
}

export default function Library({ notebooks, onOpen, onCreate, onDelete, onUpdate }: Props) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("ملاحظة جديدة");
  const [draftCover, setDraftCover] = useState<Cover>({ type: "template", id: "leather" });
  const [coverFor, setCoverFor] = useState<Notebook | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const handleDownloadApp = async () => {
    setDownloading(true);
    try {
      if (canInstallNative()) {
        const ok = await installNative();
        if (ok) {
          setDownloaded(true);
          return;
        }
      }
      await downloadAppToDevice();
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim();
    const list = [...notebooks].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!s) return list;
    return list.filter((n) => n.title.includes(s));
  }, [notebooks, q]);

  const submitCreate = () => {
    const nb: Notebook = {
      id: uid(),
      title: draftTitle.trim() || "بدون عنوان",
      cover: draftCover,
      pages: [blankPage()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onCreate(nb);
    setCreating(false);
    setDraftTitle("ملاحظة جديدة");
    onOpen(nb.id);
  };

  return (
    <div className="desk-bg flex h-full min-h-0 flex-col" dir="rtl">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src={getAppIcon()}
            alt=""
            className="h-11 w-11 rounded-2xl shadow-lg"
          />
          <div>
            <div className="text-xl font-bold tracking-tight text-stone-900">StarNote</div>
            <div className="text-[11px] text-stone-600">دفتر ملاحظات رقمي</div>
          </div>
        </div>

        <div className="glass-bar mr-auto flex flex-1 items-center gap-2 rounded-2xl px-3 py-2 max-w-md">
          <IconSearch size={18} className="text-stone-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
        </div>

        <button
          onClick={handleDownloadApp}
          disabled={downloading}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-700 text-amber-50 shadow-lg transition hover:scale-105 disabled:opacity-60"
          title="تحميل التطبيق"
        >
          {downloaded ? <IconCheck /> : <IconDownload />}
        </button>
        <button
          onClick={() => setCreating(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-amber-100 shadow-lg transition hover:scale-105"
          title="ملاحظة جديدة"
        >
          <IconPlus />
        </button>
      </header>

      <main className="scroll-thin mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-auto px-6 pb-12">
        <button
          onClick={handleDownloadApp}
          disabled={downloading}
          className="glass-bar mb-6 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-right transition hover:bg-white/80 disabled:opacity-70"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700 text-amber-50">
              {downloaded ? <IconCheck size={18} /> : <IconDownload size={18} />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">
                {downloaded ? "تم حفظ التطبيق على جهازك" : "التطبيق جاهز للتحميل"}
              </span>
              <span className="block text-[11px] text-stone-600">
                ملف StarNote.html — يعمل بدون إنترنت
              </span>
            </span>
          </span>
          <span className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-amber-100">
            {downloading ? "..." : downloaded ? "تم" : "تحميل"}
          </span>
        </button>
        {filtered.length === 0 ? (
          <div className="fade-up mt-10 flex flex-col items-center justify-center text-center">
            <img src={getAppIcon()} alt="" className="mb-5 h-24 w-24 rounded-[22px] shadow-xl" />
            <p className="text-lg font-semibold text-stone-900">StarNote</p>
            <p className="mt-1 text-stone-600">حمّل التطبيق إلى جهازك أو أنشئ دفترًا جديدًا</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleDownloadApp}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-amber-50 shadow-lg disabled:opacity-60"
              >
                <IconDownload size={18} />
                {downloaded ? "تم التحميل" : downloading ? "..." : "تحميل التطبيق"}
              </button>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-amber-100 shadow"
              >
                <IconPlus size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((nb, i) => (
              <div key={nb.id} className="fade-up relative" style={{ animationDelay: `${i * 40}ms` }}>
                <button
                  className="cover-card relative aspect-[3/4] w-full overflow-hidden rounded-md text-right"
                  style={notebookCoverStyle(nb)}
                  onClick={() => onOpen(nb.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuId(nb.id);
                  }}
                >
                  <span className="absolute inset-y-0 right-0 w-[6px] bg-black/20" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                </button>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-stone-900">{nb.title}</div>
                    <div className="text-[11px] text-stone-600">
                      {nb.pages.length} · {new Date(nb.updatedAt).toLocaleDateString("ar")}
                    </div>
                  </div>
                  <button
                    className="tool-btn h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(menuId === nb.id ? null : nb.id);
                    }}
                    title="المزيد"
                  >
                    <IconCover size={16} />
                  </button>
                </div>
                {menuId === nb.id && (
                  <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-xl bg-white p-1 shadow-xl">
                    <button
                      className="tool-btn"
                      title="الغلاف"
                      onClick={() => {
                        setCoverFor(nb);
                        setMenuId(null);
                      }}
                    >
                      <IconCover size={16} />
                    </button>
                    <button
                      className="tool-btn"
                      title="تحميل PDF"
                      disabled={pdfBusy === nb.id}
                      onClick={async () => {
                        setPdfBusy(nb.id);
                        try {
                          await exportNotebookPdf(nb, { includeCover: true });
                        } finally {
                          setPdfBusy(null);
                          setMenuId(null);
                        }
                      }}
                    >
                      <IconPdf size={16} />
                    </button>
                    <button
                      className="tool-btn text-red-600"
                      title="حذف"
                      onClick={() => {
                        onDelete(nb.id);
                        setMenuId(null);
                      }}
                    >
                      <IconTrash size={16} />
                    </button>
                    <button className="tool-btn" onClick={() => setMenuId(null)}>
                      <IconClose size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {creating && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setCreating(false)}
        >
          <div
            className="fade-up w-full max-w-2xl rounded-3xl bg-[#faf7f2] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <button className="tool-btn" onClick={() => setCreating(false)}>
                <IconClose />
              </button>
              <span className="font-semibold">دفتر جديد</span>
            </div>
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mb-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-right outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="العنوان"
              onKeyDown={(e) => e.key === "Enter" && submitCreate()}
            />
            <CoverInner value={draftCover} onChange={setDraftCover} />
            <button
              onClick={submitCreate}
              className="mt-5 w-full rounded-2xl bg-stone-900 py-3 font-semibold text-amber-100 shadow"
            >
              إنشاء
            </button>
          </div>
        </div>
      )}

      {coverFor && (
        <CoverPicker
          value={coverFor.cover}
          onChange={(cover) => {
            onUpdate({ ...coverFor, cover, updatedAt: Date.now() });
            setCoverFor({ ...coverFor, cover });
          }}
          onClose={() => setCoverFor(null)}
        />
      )}
    </div>
  );
}

function CoverInner({ value, onChange }: { value: Cover; onChange: (c: Cover) => void }) {
  return <CoverPicker value={value} onChange={onChange} embedded />;
}
