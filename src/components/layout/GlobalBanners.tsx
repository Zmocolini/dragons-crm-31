"use client";

import { AlertTriangle, Megaphone, X } from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/lib/settings/context";

/**
 * Banner-e globale randate deasupra header-ului: mentenanță + anunț.
 * Reflectă live setările din /setari → General → Preferințe generale.
 */
export function GlobalBanners() {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const maintenance = settings.platform.maintenanceMode;
  const showAnn = settings.platform.showAnnouncements && settings.platform.announcementText.trim().length > 0;

  return (
    <>
      {maintenance && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-[12.5px] font-semibold text-amber-200"
        >
          <AlertTriangle size={14} />
          <span>MOD MENTENANȚĂ ACTIV — anumite funcții pot fi indisponibile.</span>
        </div>
      )}
      {showAnn && !dismissed && (
        <div
          role="status"
          className="flex items-start gap-3 border-b border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-[12.5px] text-sky-100"
        >
          <Megaphone size={14} className="mt-0.5 shrink-0 text-sky-300" />
          <div className="min-w-0 flex-1">{settings.platform.announcementText}</div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Închide anunțul"
            className="shrink-0 rounded-md p-0.5 text-sky-300 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
