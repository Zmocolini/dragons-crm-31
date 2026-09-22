"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { useCouriers } from "@/lib/couriers/context";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { AddDuplicatePairDialog } from "./AddDuplicatePairDialog";
import { cn } from "@/lib/utils/cn";

/** Buton + dropdown pentru gestionarea perechilor de cont dublu. */
export function DuplicatePairsMenu() {
  const { pairs, removePair, updatePair } = useDuplicatePairs();
  const { allRows } = useCouriers();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const nameOf = (id: string) => allRows.find((c) => c.id === id)?.fullName ?? "?";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[12.5px] font-semibold text-cyan-100 hover:bg-cyan-500/15"
      >
        <Copy size={13} /> Cont dublu
        {pairs.length > 0 && <span className="rounded bg-black/40 px-1 text-[10px] font-mono">{pairs.length}</span>}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[340px] overflow-hidden rounded-lg border border-line bg-card p-1 shadow-lg shadow-black/40">
          <button
            type="button"
            onClick={() => { setAddOpen(true); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[12.5px] font-semibold text-emerald-200 hover:bg-emerald-500/10"
          >
            <Plus size={13} /> Adaugă pereche
          </button>
          {pairs.length > 0 && <div className="my-1 border-t border-line/60" />}
          {pairs.length === 0 ? (
            <div className="px-2.5 py-2 text-[11.5px] text-fg-muted">Nicio pereche adăugată încă.</div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {pairs.map((p, i) => (
                <div key={i} className="rounded px-2.5 py-2 hover:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-[12px]">
                      <div className="truncate font-semibold text-fg">{nameOf(p.aId)}</div>
                      <div className="text-fg-dim">↔</div>
                      <div className="truncate font-semibold text-fg">{nameOf(p.bId)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePair(p.aId, p.bId)}
                      title="Șterge perechea"
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-1 text-[10.5px] text-fg-muted">
                      <span className="whitespace-nowrap">Taxă/1</span>
                      <input
                        type="text" inputMode="decimal" placeholder="—"
                        value={p.feeOnce ?? ""}
                        onChange={(e) => {
                          const t = e.target.value.trim().replace(",", ".");
                          const n = t === "" ? null : Number(t);
                          updatePair(p.aId, p.bId, { feeOnce: Number.isFinite(n as number) && (n as number) >= 0 ? (n as number) : null });
                        }}
                        className="h-6 w-full rounded border border-line bg-card-2 px-1.5 text-right text-[11px] font-mono text-fg focus:border-violet-500/60 focus:outline-none"
                      />
                      <span className="text-[10px] text-fg-dim">RON</span>
                    </label>
                    <label className="flex items-center gap-1 text-[10.5px] text-fg-muted">
                      <span className="whitespace-nowrap">Comis./1</span>
                      <input
                        type="text" inputMode="decimal" placeholder="—"
                        value={p.commissionPct ?? ""}
                        onChange={(e) => {
                          const t = e.target.value.trim().replace(",", ".");
                          const n = t === "" ? null : Number(t);
                          updatePair(p.aId, p.bId, { commissionPct: Number.isFinite(n as number) && (n as number) >= 0 ? (n as number) : null });
                        }}
                        className="h-6 w-full rounded border border-line bg-card-2 px-1.5 text-right text-[11px] font-mono text-fg focus:border-violet-500/60 focus:outline-none"
                      />
                      <span className="text-[10px] text-fg-dim">%</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddDuplicatePairDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
