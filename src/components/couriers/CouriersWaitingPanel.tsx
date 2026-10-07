"use client";

import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useSettings } from "@/lib/settings/context";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

export const PLATFORM_NAME: Record<PlatformKey, string> = {
  bolt: "Bolt Food",
  wolt: "Wolt",
  glovo: "Glovo",
};

type Props = {
  counts: Record<PlatformKey, number>;
  selected: PlatformKey | "any";
  onSelect: (next: PlatformKey | "any") => void;
};

/** Afișat doar pe segmentul „Așteaptă loc": explicația + câți așteaptă pe fiecare platformă. */
export function CouriersWaitingPanel({ counts, selected, onSelect }: Props) {
  const { settings } = useSettings();
  const platforms = (Object.keys(PLATFORM_NAME) as PlatformKey[]).filter((p) => settings.platforms[p] === "active");

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-fg-muted">
        Curieri cu acte depuse care așteaptă loc pe o platformă suplimentară în orașul lor.
        Când apare un slot, sună curierul și marchează-l activat.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(selected === p ? "any" : p)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
              selected === p ? "border-violet-500/60 bg-violet-500/[0.08]" : "border-line bg-card hover:bg-card-hover",
            )}
          >
            <PlatformLogo platform={p} size={40} rounded="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                Așteaptă {PLATFORM_NAME[p]}
              </div>
              <div className="mt-0.5 text-[24px] font-bold tabular-nums text-fg">{counts[p]}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
