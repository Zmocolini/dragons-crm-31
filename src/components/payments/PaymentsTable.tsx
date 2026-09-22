"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp, Check, CheckCheck, Clock, Download, Edit, Eye, FileDown,
  History, Minus, MoreVertical, Plus, StickyNote, Trash2, User,
} from "lucide-react";
import { PlatformChip } from "@/components/ui/PlatformLogo";
import { subcontractorFor, subcontractorInitials } from "@/lib/subcontractors/name-map";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { isMergedPayment } from "@/lib/payments/merge-duplicates";
import type { Permission } from "@/lib/rbac/roles";
import {
  PAYMENT_SOURCE_LABEL, PAYMENT_SOURCE_STYLE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE,
  deductionsTotal, formatMoney, formatPeriodShort, paymentSource,
  type Currency, type Payment,
} from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

export type RowAction =
  | "view" | "edit" | "approve" | "processing" | "paid"
  | "add_deduction" | "add_note" | "download" | "view_courier" | "history";

export type BulkAction = "approve" | "processing" | "paid" | "export" | "delete";
export type SortKey = "name" | "gross" | "commission" | "net" | "status";

function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function PaymentsTable({
  rows, currency, selectedIds, onToggleRow, onToggleAll,
  selectedPaymentId, onSelect, onRowAction, sort, onSort, can, onBulk, onClearSelection,
  mergePairs, dupCandidates, onCreatePair, onSplit,
}: {
  rows: Payment[];
  currency: Currency;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  selectedPaymentId: string | null;
  onSelect: (id: string) => void;
  onRowAction: (id: string, action: RowAction) => void;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  can: (p: Permission) => boolean;
  onBulk: (action: BulkAction) => void;
  onClearSelection: () => void;
  /** Perechi manuale de plăți combinate (mutuale). */
  mergePairs?: Map<string, string>;
  /** Toți candidații 2× din setul filtrat curent — sursă pentru picker. */
  dupCandidates?: Payment[];
  /** Creează o pereche manuală între două plăți. */
  onCreatePair?: (a: string, b: string) => void;
  /** Desparte perechea unei plăți. */
  onSplit?: (paymentId: string) => void;
}) {
  const pageIds = rows.map((r) => r.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someChecked = pageIds.some((id) => selectedIds.has(id)) && !allChecked;
  const canFinance = can("payments.create");
  const selectedCount = selectedIds.size;

  return (
    <div className="rounded-xl border border-line/60 bg-card">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line/60 bg-violet-500/[0.06] px-3 py-2">
          <span className="text-[12.5px] font-semibold text-fg">{selectedCount} selectate</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {canFinance && <BulkBtn icon={CheckCheck} label="Aprobă" onClick={() => onBulk("approve")} />}
            {canFinance && <BulkBtn icon={Clock} label="În proces" onClick={() => onBulk("processing")} />}
            {canFinance && <BulkBtn icon={Check} label="Marchează plătite" tone="emerald" onClick={() => onBulk("paid")} />}
            <BulkBtn icon={Download} label="Exportă selectate" onClick={() => onBulk("export")} />
            {canFinance && <BulkBtn icon={Trash2} label="Șterge curieri" tone="rose" onClick={() => onBulk("delete")} />}
            <button type="button" onClick={onClearSelection} className="rounded-lg px-2 py-1.5 text-[12px] text-fg-dim hover:text-fg">Anulează</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line/60 text-[11px] uppercase tracking-wider text-fg-dim">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Selectează tot"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                  className="h-3.5 w-3.5 accent-violet-500"
                />
              </th>
              <th className="w-10 px-2 py-2.5">#</th>
              <SortableTh label="Curier" k="name" sort={sort} onSort={onSort} />
              <th className="px-3 py-2.5">Platformă</th>
              <th className="px-3 py-2.5">Sursă</th>
              <th className="px-3 py-2.5">Perioadă</th>
              <SortableTh label="Venit brut" k="gross" sort={sort} onSort={onSort} align="right" />
              <SortableTh label="Comision" k="commission" sort={sort} onSort={onSort} align="right" />
              <th className="px-3 py-2.5 text-right">Deduceri</th>
              <SortableTh label="De plată" k="net" sort={sort} onSort={onSort} align="right" />
              <SortableTh label="Status" k="status" sort={sort} onSort={onSort} />
              <th className="w-12 px-3 py-2.5 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-14 text-center">
                  <div className="mx-auto max-w-sm">
                    <div className="text-[13.5px] font-semibold text-fg">Nicio plată</div>
                    <p className="mt-1 text-[12px] text-fg-muted">Nu există plăți pentru filtrele curente. Ajustează filtrele sau adaugă o plată nouă.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((p, i) => {
                const st = PAYMENT_STATUS_STYLE[p.status];
                const checked = selectedIds.has(p.id);
                const active = selectedPaymentId === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={cn(
                      "cursor-pointer border-b border-line/40 text-[12.5px] transition-colors hover:bg-white/[0.03]",
                      active && "bg-violet-500/[0.06]",
                    )}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Selectează ${p.recipient.name}`} checked={checked} onChange={() => onToggleRow(p.id)} className="h-3.5 w-3.5 accent-violet-500" />
                    </td>
                    <td className="px-2 py-2.5 text-fg-dim tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onRowAction(p.id, "view_courier"); }} className="flex items-center gap-2.5 text-left hover:opacity-90">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-[10.5px] font-bold text-fg">
                          {initials(p.recipient.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-fg">{p.recipient.name}</span>
                          <span className="block truncate text-[10.5px] text-fg-dim">{p.recipient.city ?? "—"}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {(p.platforms ?? (p.recipient.platform ? [p.recipient.platform] : [])).map((pl) => (
                          <PlatformChip key={pl} platform={pl} size={16} showLabel={false} />
                        ))}
                        <SubcontractorBadge name={subcontractorFor(p.recipient.name)} />
                        <DuplicateAccountBadge
                          payment={p}
                          candidates={dupCandidates ?? []}
                          mergePairs={mergePairs}
                          onCreatePair={onCreatePair}
                          onSplit={onSplit}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {(() => {
                        const src = paymentSource(p.reference);
                        return (
                          <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-semibold", PAYMENT_SOURCE_STYLE[src])}>
                            {PAYMENT_SOURCE_LABEL[src]}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{formatPeriodShort(p.periodStartIso, p.periodEndIso)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-fg">{formatMoney(p.breakdown.grossRevenue, currency)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div className="text-fg-muted">{formatMoney(p.breakdown.fleetCommission, currency)}</div>
                      {p.commissionPercentage != null && p.commissionPercentage > 0 && (
                        <div className="text-[10px] text-fg-dim">{p.commissionPercentage}%</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">{formatMoney(deductionsTotal(p.breakdown), currency)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{formatMoney(p.totalCalculated, currency)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium", st.chip)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                        {PAYMENT_STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu payment={p} canFinance={canFinance} onAction={(a) => onRowAction(p.id, a)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubcontractorBadge({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span
      title={`Subcontractor: ${name}`}
      className="group relative inline-flex h-4 min-w-4 items-center justify-center rounded border border-amber-500/40 bg-amber-500/15 px-1 text-[9.5px] font-bold uppercase leading-none tracking-wider text-amber-200 hover:bg-amber-500/25"
    >
      {subcontractorInitials(name)}
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-[10.5px] font-semibold text-fg shadow-lg shadow-black/40 group-hover:block">
        {name}
      </span>
    </span>
  );
}

function DuplicateAccountBadge({
  payment, candidates, mergePairs, onCreatePair, onSplit,
}: {
  payment: Payment;
  candidates: Payment[];
  mergePairs?: Map<string, string>;
  onCreatePair?: (a: string, b: string) => void;
  onSplit?: (paymentId: string) => void;
}) {
  const { groupFor: duplicateGroupFor } = useDuplicatePairs();
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  // Un rând sintetic (merged) → arată doar badge-ul „1×" + buton „−" pentru split.
  const merged = isMergedPayment(payment.id);
  // Rând obișnuit: verific dacă e într-o pereche manuală.
  const paired = !merged && !!mergePairs?.has(payment.id);
  const group = duplicateGroupFor(payment.recipient.name);

  // Un rând care nu-i din grup ȘI nu-i sintetic → fără badge.
  if (!merged && !group) return null;

  const tooltipTitle = merged
    ? "Combinate"
    : group
      ? `Cont dublu — ${group.personId}: ${group.aliases.map((a) => `${a.name} (${a.platform.toUpperCase()})`).join("  |  ")}`
      : "";

  // Candidații pentru picker = toate 2× din pagină, mai puțin plata curentă
  // și cele deja perechizite (ca să nu re-perechizeze).
  const otherOptions = candidates.filter((c) =>
    c.id !== payment.id
    && !(mergePairs?.has(c.id)),
  );

  return (
    <span ref={wrapRef} className="relative inline-flex items-center gap-0.5">
      <span
        title={tooltipTitle}
        className={cn(
          "group relative inline-flex h-4 min-w-4 items-center justify-center rounded border px-1 text-[9.5px] font-bold uppercase leading-none tracking-wider transition-colors",
          merged || paired
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
            : "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25",
        )}
      >
        {merged || paired ? "1×" : "2×"}
        {group && (
          <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-[10.5px] font-semibold text-fg shadow-lg shadow-black/40 group-hover:block">
            <div className={cn("mb-0.5", merged || paired ? "text-emerald-300" : "text-cyan-300")}>
              {merged || paired ? "Combinate" : "Cont dublu"} — {group.personId}
            </div>
            {group.aliases.map((a, i) => (
              <div key={i} className="text-[10px] text-fg-muted">
                {a.name} <span className="text-fg-dim">·</span> {a.platform.toUpperCase()}
              </div>
            ))}
          </span>
        )}
      </span>
      {(merged || paired) && onSplit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSplit(payment.id); }}
          title="Desparte perechea"
          className="inline-flex h-4 w-4 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
        >
          <Minus size={9} />
        </button>
      )}
      {!merged && !paired && onCreatePair && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
          title="Alege contul cu care se combină"
          className="inline-flex h-4 w-4 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
        >
          <Plus size={9} />
        </button>
      )}
      {pickerOpen && !merged && !paired && onCreatePair && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-40 mt-1 max-h-[280px] min-w-[240px] overflow-y-auto rounded-lg border border-line bg-card p-1 shadow-lg shadow-black/40"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-dim">
            Combină cu:
          </div>
          {otherOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-[11px] text-fg-muted">Niciun alt cont dublu disponibil</div>
          ) : (
            otherOptions.map((c) => {
              const g = duplicateGroupFor(c.recipient.name);
              const platform = c.recipient.platform ?? (c.platforms?.[0] ?? "—");
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setPickerOpen(false); onCreatePair(payment.id, c.id); }}
                  className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[11.5px] text-fg hover:bg-emerald-500/10 hover:text-emerald-100"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.recipient.name}</span>
                    {g && <span className="block text-[9.5px] text-fg-dim">grup: {g.personId}</span>}
                  </span>
                  <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-fg-dim">
                    {String(platform)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </span>
  );
}

function SortableTh({
  label, k, sort, onSort, align = "left",
}: {
  label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const on = sort.key === k;
  return (
    <th className={cn("px-3 py-2.5", align === "right" && "text-right")}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-fg", on ? "text-fg" : "")}>
        {label}
        <ArrowDownUp size={11} className={cn(on ? "text-violet-300" : "text-fg-dim/50")} />
      </button>
    </th>
  );
}

function BulkBtn({ icon: Icon, label, onClick, tone }: { icon: typeof Check; label: string; onClick: () => void; tone?: "emerald" | "rose" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium",
        tone === "emerald" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
        tone === "rose"    && "border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
        !tone              && "border-line bg-card-hover text-fg hover:bg-white/[0.06]",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function RowMenu({ payment, canFinance, onAction }: { payment: Payment; canFinance: boolean; onAction: (a: RowAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const isPaid = payment.status === "paid";
  const act = (a: RowAction) => { onAction(a); setOpen(false); };

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.06] hover:text-fg" aria-label="Acțiuni">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
          <MenuItem icon={Eye} label="Vezi detalii" onClick={() => act("view")} />
          {canFinance && <MenuItem icon={Edit} label="Editează" onClick={() => act("edit")} />}
          {canFinance && payment.status === "in_review" && <MenuItem icon={CheckCheck} label="Aprobă" onClick={() => act("approve")} className="text-sky-300" />}
          {canFinance && !isPaid && payment.status !== "partial" && <MenuItem icon={Clock} label="Marchează în proces" onClick={() => act("processing")} className="text-amber-300" />}
          {canFinance && !isPaid && <MenuItem icon={Check} label="Marchează ca plătit" onClick={() => act("paid")} className="text-emerald-300" />}
          {canFinance && <MenuItem icon={Plus} label="Adaugă deducere" onClick={() => act("add_deduction")} />}
          <MenuItem icon={StickyNote} label="Adaugă notă" onClick={() => act("add_note")} />
          <div className="my-1 h-px bg-line/40" />
          <MenuItem icon={FileDown} label="Descarcă fișa" onClick={() => act("download")} />
          <MenuItem icon={User} label="Vezi curier" onClick={() => act("view_courier")} />
          <MenuItem icon={History} label="Vezi istoric" onClick={() => act("history")} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, className }: { icon: typeof Eye; label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg hover:bg-card-hover", className)}>
      <Icon size={12} />
      {label}
    </button>
  );
}
