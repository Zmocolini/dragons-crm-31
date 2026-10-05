"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { LANGS, LANG_KEY, readLang, type Lang } from "@/lib/i18n/translator";
import { cn } from "@/lib/utils/cn";

/** Comutator RO / EN în bara de sus. Schimbarea reîncarcă pagina (textele originale se restaurează curat). */
export function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>("ro");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLang(readLang()); }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (l: Lang) => {
    if (l === lang) { setOpen(false); return; }
    try { localStorage.setItem(LANG_KEY, l); } catch {}
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative" data-no-translate>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language / Limba"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
      >
        <Globe size={16} />
        {LANGS.find((l) => l.code === lang)?.label}
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-xl shadow-black/40">
          {LANGS.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                onClick={() => choose(l.code)}
                className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-white/[0.06]", l.code === lang ? "text-fg" : "text-fg-muted")}
              >
                <span className="w-6 text-[11px] font-bold text-fg-dim">{l.label}</span>
                <span className="flex-1">{l.name}</span>
                {l.code === lang && <Check size={13} className="text-emerald-300" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
