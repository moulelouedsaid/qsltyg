import leather from "./assets/covers/cover-leather.jpg?inline";
import navy from "./assets/covers/cover-navy.jpg?inline";
import sage from "./assets/covers/cover-sage.jpg?inline";
import marble from "./assets/covers/cover-marble.jpg?inline";
import sunset from "./assets/covers/cover-sunset.jpg?inline";
import night from "./assets/covers/cover-night.jpg?inline";
import cream from "./assets/covers/cover-cream.jpg?inline";
import rose from "./assets/covers/cover-rose.jpg?inline";

export const COVER_TEMPLATES = [
  { id: "leather", src: leather, name: "جلد" },
  { id: "navy", src: navy, name: "ليلي" },
  { id: "sage", src: sage, name: "أخضر" },
  { id: "marble", src: marble, name: "رخام" },
  { id: "sunset", src: sunset, name: "غروب" },
  { id: "night", src: night, name: "نجوم" },
  { id: "cream", src: cream, name: "كريمي" },
  { id: "rose", src: rose, name: "وردي" },
] as const;
