"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, FileText, Home, MoreHorizontal, Plus, Receipt, Trash2, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useInvoices, computeInvoicesKpi } from "@/lib/invoices/context";
import {
  INVOICE_DIRECTION_LABEL, INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE,
  computeInvoiceTotals, daysUntilDue, todayIsoLocal,
  type InvoiceDirection, type InvoiceStatus,
} from "@/lib/invoices/types";
import { cn } from "@/lib/utils/cn";

type TabKey = "all" | "issued" | "received";

function formatRon(n: number): string {
  return `${n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
}

export function FacturiPage() {
  const { user, activeFleetId } = useSession();
  const toast = useToast();
  const { hydrated, fleetInvoices, addInvoice, markPaid, cancelInvoice, deleteInvoice } = useInvoices();

  const [tab, setTab] = useState<TabKey>("all");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const kpi = useMemo(() => computeInvoicesKpi(fleetInvoices), [fleetInvoices]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fleetInvoices
      .filter((i) => tab === "all" ? true : i.direction === tab)
      .filter((i) => statusFilter === "all" ? true : i.status === statusFilter)
      .filter((i) => !q ? true : (
        i.number.toLowerCase().includes(q) ||
        i.counterpartyName.toLowerCase().includes(q) ||
        (i.counterpartyCui ?? "").toLowerCase().includes(q)
      ))
      .sort((a, b) => (a.issueDateIso < b.issueDateIso ? 1 : -1));
  }, [fleetInvoices, tab, statusFilter, search]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 pb-6 md:px-6 md:pt-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
          <Home size={12} /> Dashboard
        </Link>
        <ChevronRight size={12} className="text-fg-dim" />
        <span className="text-fg">Facturi</span>
      </nav>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-fg md:text-[28px]">Facturi</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Emite facturi către clienți / subcontractori și înregistrează facturile primite de la platforme și furnizori.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
        >
          <Plus size={15} /> Adaugă factură
        </button>
      </div>

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <KpiCard label="Emise (total)" value={formatRon(kpi.totalIssued)} tone="sky" />
        <KpiCard label="Achitate" value={formatRon(kpi.paidIssued)} tone="emerald" />
        <KpiCard label="Restante" value={formatRon(kpi.overdueIssued)} sub={`${kpi.overdueCount} facturi`} tone="rose" />
        <KpiCard label="Primite (cost)" value={formatRon(kpi.totalReceived)} sub={`Net: ${formatRon(kpi.netProfit)}`} tone="amber" />
      </div>

      {/* Tabs + filter + search */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex rounded-lg border border-line bg-card-hover p-0.5">
            {(["all", "issued", "received"] as TabKey[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tab === t ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
                )}
              >
                {t === "all" ? "Toate" : t === "issued" ? "Emise" : "Primite"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="Orice status" />
            {(Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={INVOICE_STATUS_LABEL[s]}
              />
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută nr, client, CUI…"
            className="ml-auto min-w-[180px] flex-1 rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none sm:max-w-[240px] sm:flex-none"
          />
        </div>

        <CardBody className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[880px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-dim">
                  <th className="px-3 py-2.5">Nr / dată</th>
                  <th className="px-3 py-2.5">Direcție</th>
                  <th className="px-3 py-2.5">{tab === "received" ? "Furnizor" : "Client"}</th>
                  <th className="px-2 py-2.5 text-right">Bază</th>
                  <th className="px-2 py-2.5 text-right">TVA</th>
                  <th className="px-2 py-2.5 text-right">Total</th>
                  <th className="px-2 py-2.5">Scadență</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="w-[80px] px-2 py-2.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {!hydrated && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-fg-muted">Se încarcă…</td></tr>
                )}
                {hydrated && visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center">
                      <Receipt size={28} className="mx-auto mb-2 text-fg-dim" />
                      <div className="text-[13px] font-semibold text-fg">Nicio factură {tab === "issued" ? "emisă" : tab === "received" ? "primită" : ""} încă</div>
                      <div className="text-[11.5px] text-fg-muted">Adaugă prima cu butonul din dreapta-sus.</div>
                    </td>
                  </tr>
                )}
                {visible.map((inv) => {
                  const dueDays = daysUntilDue(inv.dueDateIso);
                  return (
                    <tr key={inv.id} className="border-b border-line/60 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono text-[12px] font-semibold text-fg">{inv.number}</div>
                        <div className="text-[10.5px] text-fg-dim">{inv.issueDateIso}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-semibold",
                          inv.direction === "issued"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                        )}>
                          {INVOICE_DIRECTION_LABEL[inv.direction]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="text-[12.5px] font-medium text-fg">{inv.counterpartyName}</div>
                        {inv.counterpartyCui && (
                          <div className="text-[10.5px] text-fg-dim">{inv.counterpartyCui}</div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right align-top font-mono tabular-nums text-fg-muted">{inv.baseRon.toFixed(2)}</td>
                      <td className="px-2 py-2.5 text-right align-top font-mono tabular-nums text-fg-muted">{inv.vatRon.toFixed(2)} <span className="text-[10px] text-fg-dim">({inv.vatPct}%)</span></td>
                      <td className="px-2 py-2.5 text-right align-top font-mono tabular-nums font-semibold text-fg">{inv.totalRon.toFixed(2)}</td>
                      <td className="px-2 py-2.5 align-top">
                        {inv.dueDateIso ? (
                          <div>
                            <div className="text-[11.5px] text-fg-muted">{inv.dueDateIso}</div>
                            {dueDays !== null && inv.status !== "paid" && inv.status !== "cancelled" && (
                              <div className={cn(
                                "text-[10px]",
                                dueDays < 0 ? "text-rose-300" : dueDays <= 7 ? "text-amber-300" : "text-fg-dim",
                              )}>
                                {dueDays < 0 ? `${Math.abs(dueDays)} zile întârziere` : dueDays === 0 ? "azi" : `în ${dueDays} zile`}
                              </div>
                            )}
                          </div>
                        ) : <span className="text-[11px] text-fg-dim">—</span>}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-semibold", INVOICE_STATUS_STYLE[inv.status])}>
                          {INVOICE_STATUS_LABEL[inv.status]}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <RowActions
                          onMarkPaid={inv.status !== "paid" && inv.status !== "cancelled" ? () => {
                            markPaid(inv.id);
                            toast.success("Marcată ca achitată", inv.number);
                          } : undefined}
                          onCancel={inv.status !== "cancelled" ? () => {
                            cancelInvoice(inv.id);
                            toast.info("Factură anulată", inv.number);
                          } : undefined}
                          onDelete={() => {
                            deleteInvoice(inv.id);
                            toast.success("Factură ștearsă", inv.number);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Adaugă factură" size="lg">
        <AddInvoiceForm
          onCancel={() => setShowAdd(false)}
          onCreate={(input) => {
            const created = addInvoice({ ...input, tenantId: activeFleetId }, user.name);
            toast.success("Factură adăugată", created.number);
            setShowAdd(false);
          }}
        />
      </Dialog>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone: "sky" | "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    sky:     "from-sky-500/15 to-sky-500/5 text-sky-200",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-200",
    rose:    "from-rose-500/15 to-rose-500/5 text-rose-200",
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-200",
  }[tone];
  return (
    <Card className={cn("bg-gradient-to-br p-3", toneClass)}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="mt-1 text-[16px] font-bold sm:text-[17px]">{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-fg-dim">{sub}</div>}
    </Card>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active ? "border-violet-500/60 bg-violet-500/15 text-violet-100" : "border-line bg-card text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function RowActions({ onMarkPaid, onCancel, onDelete }: {
  onMarkPaid?: () => void; onCancel?: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Acțiuni"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06] hover:text-fg"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Închide" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-line bg-card p-1 shadow-lg shadow-black/40">
            {onMarkPaid && (
              <button
                type="button"
                onClick={() => { onMarkPaid(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-fg hover:bg-emerald-500/10 hover:text-emerald-200"
              >
                <Check size={13} /> Marchează achitată
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={() => { onCancel(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-fg hover:bg-amber-500/10 hover:text-amber-200"
              >
                <X size={13} /> Anulează
              </button>
            )}
            <button
              type="button"
              onClick={() => { onDelete(); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 size={13} /> Șterge
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type NewInvoicePayload = {
  direction: InvoiceDirection;
  number: string;
  issueDateIso: string;
  dueDateIso: string | null;
  counterpartyName: string;
  counterpartyCui: string | null;
  baseRon: number;
  vatPct: number;
  notes: string | null;
  tenantId: string;
};

function AddInvoiceForm({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (input: Omit<NewInvoicePayload, "tenantId">) => void;
}) {
  const [direction, setDirection] = useState<InvoiceDirection>("issued");
  const [number, setNumber] = useState(`DD-${new Date().getFullYear()}-`);
  const [issueDate, setIssueDate] = useState(todayIsoLocal());
  const [dueDate, setDueDate] = useState("");
  const [counterpartyName, setName] = useState("");
  const [cui, setCui] = useState("");
  const [baseRon, setBase] = useState<string>("");
  const [vatPct, setVatPct] = useState<number>(19);
  const [notes, setNotes] = useState("");

  const base = Number(baseRon) || 0;
  const { vatRon, totalRon } = computeInvoiceTotals(base, vatPct);
  const canSubmit = number.trim().length > 0 && counterpartyName.trim().length > 0 && base > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border border-line bg-card-hover p-0.5">
        {(["issued", "received"] as InvoiceDirection[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
              direction === d ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
            )}
          >
            {d === "issued" ? "Emisă (către client)" : "Primită (de la furnizor)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Număr factură *">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={direction === "issued" ? "DD-2026-0001" : "FUR-1234"}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label={`${direction === "issued" ? "Client" : "Furnizor"} *`}>
          <input
            type="text"
            value={counterpartyName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nume companie / persoană"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="CUI / CIF">
          <input
            type="text"
            value={cui}
            onChange={(e) => setCui(e.target.value)}
            placeholder="RO12345678"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Data emiterii *">
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Scadență">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Bază fără TVA (RON) *">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={baseRon}
            onChange={(e) => setBase(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="TVA %">
          <select
            value={vatPct}
            onChange={(e) => setVatPct(Number(e.target.value))}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={9}>9%</option>
            <option value={19}>19%</option>
          </select>
        </Field>
        <div className="flex flex-col justify-end rounded-md border border-line bg-card-2 px-2.5 py-2">
          <div className="flex items-baseline justify-between text-[11px] text-fg-muted">
            <span>TVA</span>
            <span className="font-mono tabular-nums text-fg">{vatRon.toFixed(2)} RON</span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between">
            <span className="text-[12px] font-semibold text-fg">Total</span>
            <span className="font-mono text-[14px] font-bold tabular-nums text-emerald-300">{totalRon.toFixed(2)} RON</span>
          </div>
        </div>
      </div>

      <Field label="Notițe">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          placeholder="Opțional"
        />
      </Field>

      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
        >
          Anulează
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onCreate({
            direction,
            number: number.trim(),
            issueDateIso: issueDate,
            dueDateIso: dueDate || null,
            counterpartyName: counterpartyName.trim(),
            counterpartyCui: cui.trim() || null,
            baseRon: base,
            vatPct,
            notes: notes.trim() || null,
          })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white",
            !canSubmit && "opacity-50",
          )}
        >
          <FileText size={13} /> Salvează factură
        </button>
      </DialogFooter>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
