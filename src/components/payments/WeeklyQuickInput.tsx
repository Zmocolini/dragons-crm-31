"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { useToast } from "@/components/ui/Toast";
import type { Payment, PaymentBreakdown } from "@/lib/payments/types";
import { EMPTY_BREAKDOWN, calculateTotal, round2 } from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

type Props = {
  /** Plăți sintetice + reale din săptămâna curentă, câte una per curier. */
  rows: Payment[];
  periodStartIso: string;
  periodEndIso: string;
  /** Persistă plata (real sau materializare sintetic). Trebuie să întoarcă id-ul real. */
  materialize: (p: Payment) => Payment;
  /** Aplică patch pe o plată reală. */
  updatePayment: (id: string, patch: Partial<Payment>, actorName: string) => void;
  actorName: string;
};

function formatPeriodLabel(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${pad(s.getDate())}–${pad(e.getDate())} ${months[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${pad(s.getDate())} ${months[s.getMonth()]} – ${pad(e.getDate())} ${months[e.getMonth()]} ${e.getFullYear()}`;
}

export function WeeklyQuickInput({ rows, periodStartIso, periodEndIso, materialize, updatePayment, actorName }: Props) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  // Draft: id → string (input local). Când e undefined, câmpul afișează valoarea salvată din breakdown.grossRevenue.
  const [draft, setDraft] = useState<Record<string, string>>({});

  const label = useMemo(() => formatPeriodLabel(periodStartIso, periodEndIso), [periodStartIso, periodEndIso]);

  const unfilledCount = useMemo(
    () => rows.filter((r) => (r.breakdown?.grossRevenue ?? 0) === 0).length,
    [rows],
  );

  function saveRow(p: Payment) {
    const raw = draft[p.id];
    const value = raw !== undefined ? Number(raw.replace(",", ".")) : p.breakdown.grossRevenue;
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Sumă invalidă", `${p.recipient.name}: introdu un număr pozitiv.`);
      return;
    }
    const persisted = materialize(p);
    const commissionPct = persisted.commissionPercentage ?? 0;
    const fleetCommission = round2((value * commissionPct) / 100);
    const nextBreakdown: PaymentBreakdown = {
      ...EMPTY_BREAKDOWN,
      ...persisted.breakdown,
      grossRevenue: round2(value),
      fleetCommission,
    };
    const total = calculateTotal(nextBreakdown);
    updatePayment(
      persisted.id,
      {
        breakdown: nextBreakdown,
        totalCalculated: total,
        status: persisted.status === "paid" ? persisted.status : "in_review",
      },
      actorName,
    );
    setDraft((prev) => {
      const n = { ...prev };
      delete n[p.id];
      return n;
    });
    toast.success("Venit salvat", `${p.recipient.name}: ${value.toLocaleString("ro-RO")} RON brut.`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>, p: Payment, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRow(p);
      const nextInput = document.querySelector<HTMLInputElement>(`[data-quickinput-idx="${index + 1}"]`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "Escape") {
      setDraft((prev) => {
        const n = { ...prev };
        delete n[p.id];
        return n;
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-line/70 bg-gradient-to-br from-violet-500/[0.04] to-blue-500/[0.04]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
          <Zap size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-bold text-fg">Introducere rapidă venituri</h2>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">
            Săptămâna {label} · {rows.length} curieri · {unfilledCount} de completat · Tab / Enter trec la următorul
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Ascunde" : "Deschide"}
        </button>
      </header>

      {expanded && (
        <div className="max-h-[420px] overflow-y-auto">
          <ul className="divide-y divide-line/40">
            {rows.map((p, i) => {
              const value = draft[p.id];
              const savedGross = p.breakdown?.grossRevenue ?? 0;
              const commissionPct = p.commissionPercentage ?? 0;
              const parsed = value !== undefined ? Number(value.replace(",", ".")) : savedGross;
              const previewCommission = Number.isFinite(parsed) && parsed >= 0 ? round2((parsed * commissionPct) / 100) : 0;
              const previewNet = Number.isFinite(parsed) && parsed >= 0 ? round2(parsed - previewCommission) : 0;
              const filled = savedGross > 0;
              const dirty = value !== undefined && Number(value.replace(",", ".")) !== savedGross;
              return (
                <li
                  key={p.id}
                  className={cn(
                    "grid items-center gap-2 px-4 py-2.5 transition-colors md:grid-cols-[minmax(200px,1.5fr)_minmax(120px,1fr)_minmax(90px,90px)_minmax(90px,90px)_auto]",
                    filled && !dirty && "bg-emerald-500/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.recipient.name} size={28} />
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[12.5px] font-medium text-fg">{p.recipient.name}</div>
                      <div className="text-[10.5px] text-fg-dim">{p.recipient.city ?? "—"}</div>
                    </div>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-fg-dim">
                    <span className="shrink-0">Venit brut</span>
                    <input
                      data-quickinput-idx={i}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={value !== undefined ? value : (savedGross > 0 ? String(savedGross) : "")}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => onKey(e, p, i)}
                      placeholder="0"
                      className="h-8 min-w-0 flex-1 rounded-md border border-line bg-card-2 px-2 text-right text-[13px] font-mono text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
                    />
                    <span className="shrink-0 text-[11px] text-fg-dim">RON</span>
                  </label>

                  <div className="text-right text-[11px] text-fg-dim tabular-nums">
                    <div className="text-[10px]">Comision {commissionPct}%</div>
                    <div className="text-fg-muted">−{previewCommission.toLocaleString("ro-RO")}</div>
                  </div>

                  <div className="text-right text-[11px] tabular-nums">
                    <div className="text-[10px] text-fg-dim">Net</div>
                    <div className={cn("font-semibold", previewNet > 0 ? "text-emerald-300" : "text-fg-dim")}>
                      {previewNet.toLocaleString("ro-RO")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveRow(p)}
                    disabled={!dirty && filled}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      dirty || !filled
                        ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500"
                        : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    <Check size={11} />
                    {filled && !dirty ? "Salvat" : "Salvează"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
