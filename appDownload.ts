import icon from "../assets/icon-512.png?inline";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallEvent | null = null;

export function getAppIcon(): string {
  return icon as string;
}

export function setupPwa() {
  const href = icon as string;

  setLink("icon", href);
  setLink("apple-touch-icon", href);

  const manifest = {
    name: "StarNote",
    short_name: "StarNote",
    description: "دفتر ملاحظات رقمي",
    start_url: ".",
    scope: ".",
    display: "standalone",
    orientation: "any",
    background_color: "#cfc6b8",
    theme_color: "#1c1917",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: href, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const url = URL.createObjectURL(blob);
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = url;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
  });
}

export function canInstallNative(): boolean {
  return Boolean(deferred);
}

export async function installNative(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  return choice.outcome === "accepted";
}

export async function downloadAppToDevice(): Promise<void> {
  let html = "";
  try {
    const res = await fetch(window.location.href, { cache: "no-store" });
    html = await res.text();
  } catch {
    html = "<!DOCTYPE html>" + document.documentElement.outerHTML;
  }
  if (!html.includes("<html")) {
    html = "<!DOCTYPE html>" + document.documentElement.outerHTML;
  }
  saveBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "StarNote.html");
}

export function downloadJson(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2);
  saveBlob(new Blob([text], { type: "application/json;charset=utf-8" }), filename);
}

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}
