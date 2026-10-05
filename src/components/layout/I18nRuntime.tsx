"use client";

import { useEffect } from "react";
import { readLang, startTranslator } from "@/lib/i18n/translator";

/** Pornește traducătorul după hidratare (altfel React ar vedea un DOM diferit) și dezvăluie pagina. */
export function I18nRuntime() {
  useEffect(() => {
    const lang = readLang();
    const reveal = () => document.documentElement.removeAttribute("data-i18n-pending");
    if (lang === "ro") { reveal(); return; }
    let stop: (() => void) | undefined;
    let cancelled = false;
    fetch(`/i18n/${lang}.json`)
      .then((r) => r.json())
      .then((dict: Record<string, string>) => { if (!cancelled) stop = startTranslator(lang, dict); })
      .catch(() => {})
      .finally(reveal);
    return () => { cancelled = true; stop?.(); };
  }, []);
  return null;
}
