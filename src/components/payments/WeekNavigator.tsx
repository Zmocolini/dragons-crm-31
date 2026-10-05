"use client";

import { useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, History } from "lucide-react";
import type { WeekOption } from "@/lib/payments/periods";
import { cn } from "@/lib/utils/cn";

type Props = {
  selectedWeek: string; // "auto" | "all" | key
  activeWeekIso: string;
  activeOption: WeekOption | null;
  availableWeeks: WeekOption[];
  onSelectWeek: (key: string) => void;
};

export function WeekNavigator({
  selectedWeek,
  activeWeekIso,
  activeOption,
  availableWeeks,
  onSelectWeek,
}: Props) {
  const activeWeek = activeOption ?? availableWeeks[0] ?? null;

  const currentIndex = useMemo(() => {
    if (!activeWeek) return -1;
    return availableWeeks.findIndex((w) => w.key === activeWeek.key);
  }, [availableWeeks, activeWeek]);

  const canGoNewer = currentIndex > 0;
  const canGoOlder = currentIndex >= 0 && currentIndex < availableWeeks.length - 1;

  const handlePrev = () => {
    if (canGoOlder) {
      onSelectWeek(availableWeeks[currentIndex + 1].key);
    }
  };

  const handleNext = () => {
    if (canGoNewer) {
      onSelectWeek(availableWeeks[currentIndex - 1].key);
    }
  };

  const isAll = selectedWeek === "all";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/30 via-card to-card p-3 shadow-sm">
      {/* Stânga: Comutator săptămână (Săgeți + Nume perioadă/raport + Badge) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card-2 p-0.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoOlder || isAll}
            title="Raportul / Săptămâna anterioară"
            aria-label="Raportul / Săptămâna anterioară"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-white/[0.08] hover:text-fg transition-colors",
              (!canGoOlder || isAll) && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-fg-muted",
            )}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1">
            <Calendar size={15} className="text-violet-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                {isAll
                  ? "Toate rapoartele"
                  : activeWeek?.reportName ?? (activeWeek?.isCurrent ? "Săptămâna curentă" : "Raport selectat")}
              </span>
              <span className="text-[13.5px] font-bold text-fg">
                {isAll
                  ? "Istoric cumulat (toate perioadele)"
                  : activeWeek?.displayTitle ?? activeWeek?.label ?? activeWeekIso}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNewer || isAll}
            title="Raportul / Săptămâna următoare"
            aria-label="Raportul / Săptămâna următoare"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-white/[0.08] hover:text-fg transition-colors",
              (!canGoNewer || isAll) && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-fg-muted",
            )}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {!isAll && activeWeek && (
          <div className="flex flex-wrap items-center gap-2">
            {activeWeek.sourceDetail === "gusty_bolt" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-200">
                <FileSpreadsheet size={11} /> Gusty Bolt
              </span>
            )}
            {activeWeek.sourceDetail === "ttg_bolt" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200">
                <FileSpreadsheet size={11} /> TTG Bolt
              </span>
            )}
            {activeWeek.sourceDetail === "gusty_wolt" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200">
                <FileSpreadsheet size={11} /> Gusty Wolt {activeWeek.woltCycle ? `· ${activeWeek.woltCycle.shortBadge}` : ""}
              </span>
            )}
            {activeWeek.sourceDetail === "gusty_glovo" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                <FileSpreadsheet size={11} /> Gusty Glovo
              </span>
            )}
            {activeWeek.sourceDetail === "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-purple-200">
                <FileSpreadsheet size={11} /> Cumulat (Toate)
              </span>
            )}
            <span className="rounded-full border border-line bg-card-2 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
              Săptămâna {activeWeek.weekNumber}
            </span>
            <span className="text-[11.5px] font-semibold tabular-nums text-fg-dim">
              ({activeWeek.count} {activeWeek.count === 1 ? "plată" : "plăți"} · {activeWeek.totalCalculated.toLocaleString("ro-RO")} RON)
            </span>
          </div>
        )}
      </div>

      {/* Dreapta: Selector dropdown + buton rapid spre cel mai recent raport */}
      <div className="flex items-center gap-2">
        {selectedWeek !== "auto" && currentIndex !== 0 && !isAll && availableWeeks.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectWeek("auto")}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11.5px] font-medium text-violet-300 hover:bg-white/[0.05]"
          >
            Cel mai recent
          </button>
        )}

        <div className="flex items-center rounded-lg border border-line bg-card-2 px-2.5 py-1.5">
          <History size={13} className="mr-2 text-fg-dim" />
          <select
            value={selectedWeek === "auto" ? (activeWeek?.key ?? "") : selectedWeek}
            onChange={(e) => onSelectWeek(e.target.value)}
            className="bg-transparent text-[12px] font-semibold text-fg focus:outline-none cursor-pointer max-w-[380px]"
          >
            {availableWeeks.map((w) => (
              <option key={w.key} value={w.key} className="bg-card text-fg">
                {w.dropdownLabel}
              </option>
            ))}
            <option value="all" className="bg-card text-fg">
              Toate perioadele (Istoric complet)
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}

