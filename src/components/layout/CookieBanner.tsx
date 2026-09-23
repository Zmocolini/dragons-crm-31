"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const CONSENT_COOKIE = "crm31_cookie_consent";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number): void {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookie(CONSENT_COOKIE)) setVisible(true);
  }, []);

  const accept = () => {
    setCookie(CONSENT_COOKIE, "accepted-" + new Date().toISOString(), 365);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-line bg-card/95 backdrop-blur shadow-lg shadow-black/40"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Cookie size={18} className="shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1 text-[12.5px] text-fg">
          <b>Cookie-uri:</b> folosim doar cookie-uri strict necesare (sesiune + preferință banner). Fără tracking sau reclame.
          {" "}
          <Link href="/politica-cookies" className="font-semibold text-violet-300 hover:underline">
            Vezi detalii
          </Link>
        </div>
        <button
          type="button"
          onClick={accept}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
        >
          OK, am înțeles
        </button>
        <button
          type="button"
          onClick={accept}
          aria-label="Închide"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-white/[0.05] hover:text-fg"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
