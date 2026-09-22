"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
};

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function CouriersPagination({
  currentPage, totalPages, pageSize, totalRows, onPageChange,
}: Props) {
  const [jumpValue, setJumpValue] = useState("");
  const from = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalRows);

  const goto = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    onPageChange(clamped);
  };

  return (
    <div className="flex flex-col items-stretch gap-3 border-t border-line/60 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="text-[12px] text-fg-muted">
        Afișează <span className="font-semibold text-fg">{from}–{to}</span> din{" "}
        <span className="font-semibold text-fg">{totalRows.toLocaleString("ro-RO")}</span> rezultate
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goto(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Pagina anterioară"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers(currentPage, totalPages).map((p, idx) =>
          p === "…" ? (
            <span key={`gap_${idx}`} className="px-1 text-[12px] text-fg-dim">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goto(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12px] font-medium transition-colors",
                p === currentPage
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/30"
                  : "text-fg-muted hover:bg-white/[0.05] hover:text-fg",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => goto(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Pagina următoare"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseInt(jumpValue, 10);
          if (Number.isFinite(n)) {
            goto(n);
            setJumpValue("");
          }
        }}
      >
        <label className="text-[12px] text-fg-muted" htmlFor="jump-page">Salt la pagina:</label>
        <input
          id="jump-page"
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          className="h-8 w-14 rounded-lg border border-line bg-card-2 px-2 text-center text-[12px] text-fg focus:border-indigo-400/60 focus:outline-none"
        />
        <button
          type="submit"
          className="h-8 rounded-lg border border-line bg-card-2 px-3 text-[12px] font-semibold text-fg-muted transition-colors hover:text-fg"
        >
          OK
        </button>
      </form>
    </div>
  );
}
