"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useCouriers } from "@/lib/couriers/context";
import { useSettings } from "@/lib/settings/context";
import { useToast } from "@/components/ui/Toast";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const PLATFORM_NAME: Record<PlatformKey, string> = {
  bolt:  "Bolt Food",
  wolt:  "Wolt",
  glovo: "Glovo",
};

export function CourierWaitlistButton({ row }: { row: CourierRow }) {
  const { updateCourier } = useCouriers();
  const { settings } = useSettings();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activePlatforms = (Object.keys(PLATFORM_NAME) as PlatformKey[])
    .filter((p) => settings.platforms[p] === "active");

  const waitlist = row.waitlistedPlatforms ?? [];
  const waitingCount = waitlist.length;

  function toggleWaitlist(platform: PlatformKey) {
    if (row.platforms.includes(platform)) {
      toast.info("Deja activ", `${row.fullName} este deja activ pe ${PLATFORM_NAME[platform]}.`);
      return;
    }
    const isWaiting = waitlist.includes(platform);
    const next = isWaiting
      ? waitlist.filter((p) => p !== platform)
      : [...waitlist, platform];
    updateCourier(row.id, { waitlistedPlatforms: next });
    if (isWaiting) {
      toast.info("Nu mai așteaptă loc", `${row.fullName} nu mai așteaptă ${PLATFORM_NAME[platform]}.`);
    } else {
      toast.success("Așteaptă loc", `${row.fullName} așteaptă ${PLATFORM_NAME[platform]}.`);
    }
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Așteaptă altă platformă pentru ${row.fullName}`}
        title={waitingCount > 0 ? `Așteaptă ${waitingCount} platformă/e` : "Adaugă la lista de așteptare"}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
          waitingCount > 0
            ? "border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
            : "border-line bg-card text-fg-dim hover:bg-white/[0.06] hover:text-fg",
        )}
      >
        <Clock size={14} strokeWidth={2} />
        {waitingCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
            {waitingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
          <div className="border-b border-line/60 bg-card-2/60 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Așteaptă și pe
            </div>
            <div className="mt-0.5 truncate text-[11px] text-fg-muted">
              {row.fullName}
            </div>
          </div>
          <ul className="p-1">
            {activePlatforms.map((p) => {
              const isActive = row.platforms.includes(p);
              const isWaiting = waitlist.includes(p);
              return (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => { toggleWaitlist(p); }}
                    disabled={isActive}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12.5px] transition-colors",
                      isActive && "cursor-not-allowed opacity-60",
                      !isActive && "hover:bg-card-hover",
                    )}
                  >
                    <PlatformLogo platform={p} size={20} rounded="md" />
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">
                      {PLATFORM_NAME[p]}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <Check size={9} strokeWidth={3} />
                        activ
                      </span>
                    )}
                    {!isActive && isWaiting && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                        <Clock size={9} />
                        așteaptă
                      </span>
                    )}
                    {!isActive && !isWaiting && (
                      <span className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-dim">
                        <Plus size={9} strokeWidth={3} />
                        adaugă
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
