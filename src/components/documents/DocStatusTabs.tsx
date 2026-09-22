"use client";

import { useDocumentFilters } from "@/lib/documents/filters-context";
import type { DocStatusTab } from "@/lib/documents/analytics";
import { cn } from "@/lib/utils/cn";

const TABS: Array<{ key: DocStatusTab; label: string }> = [
  { key: "all", label: "Toți curierii" },
  { key: "missing", label: "Lipsă documente" },
  { key: "expiring", label: "Expiră curând" },
  { key: "in_review", label: "În verificare" },
  { key: "complete", label: "Complete" },
];

export function DocStatusTabs({ counts }: { counts: Record<DocStatusTab, number> }) {
  const { filters, setTab } = useDocumentFilters();
  return (
    <div className="overflow-x-auto border-b border-line">
      <div className="flex min-w-max items-center gap-1">
        {TABS.map((t) => {
          const active = filters.tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn("relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors", active ? "text-fg" : "text-fg-muted hover:text-fg")}>
              {t.label}
              {t.key !== "all" && <span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] tabular-nums text-fg-muted">{counts[t.key]}</span>}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
