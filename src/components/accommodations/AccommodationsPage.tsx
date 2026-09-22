"use client";

import { useMemo, useState } from "react";
import {
  Building2, CheckCircle2, DoorOpen, Home, MoreHorizontal, Plus, Search, Wallet, Wrench, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useAccommodations, computeAccommodationsKpi } from "@/lib/accommodations/context";
import {
  ACCOMMODATION_STATUS_LABEL, ACCOMMODATION_STATUS_STYLE, ACCOMMODATION_TYPE_LABEL,
  daysUntil,
  type Accommodation, type AccommodationStatus, type AccommodationType,
} from "@/lib/accommodations/types";
import { formatInt } from "@/lib/reports/analytics";
import { cn } from "@/lib/utils/cn";
import { AddAccommodationDialog } from "./AddAccommodationDialog";
import { AssignCourierDialog } from "./AssignCourierDialog";
import { EndAssignmentDialog } from "./EndAssignmentDialog";

function formatRon(n: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Math.round(n))} RON`;
}
function fmt(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function AccommodationsPage() {
  const { can } = useSession();
  const toast = useToast();
  const {
    hydrated, fleetAccommodations, fleetAssignments,
    activeAssignmentsOf, historyOf, occupiedCount,
    deleteAccommodation, sendToService, markActive, retireAccommodation,
    endAssignment,
  } = useAccommodations();
  void endAssignment;

  const canManage = can("cazari.view");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccommodationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AccommodationStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState<string | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Accommodation | null>(null);
  const [endFor, setEndFor] = useState<{ acc: Accommodation; assignmentId: string } | null>(null);
  const [drawerFor, setDrawerFor] = useState<Accommodation | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const kpi = useMemo(() => computeAccommodationsKpi(fleetAccommodations, fleetAssignments), [fleetAccommodations, fleetAssignments]);

  const cities = useMemo(
    () => Array.from(new Set(fleetAccommodations.map((a) => a.city).filter(Boolean))).sort(),
    [fleetAccommodations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fleetAccommodations.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (cityFilter !== "all" && a.city !== cityFilter) return false;
      if (q) {
        const hay = `${a.name} ${a.address} ${a.city} ${a.ownerName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fleetAccommodations, search, typeFilter, statusFilter, cityFilter]);

  function handleDelete(a: Accommodation) {
    if (!window.confirm(`Ștergi definitiv „${a.name}"? Această acțiune nu poate fi anulată.`)) return;
    const res = deleteAccommodation(a.id);
    if (res.ok) toast.success("Cazare ștearsă", a.name);
    else toast.error("Nu se poate șterge", res.reason ?? "Eroare necunoscută.");
  }

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-fg">Cazări</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Inventarul de cazări al flotei tale. Urmărește locurile, cine e cazat unde și încasările lunare.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!canManage}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:from-violet-500 hover:to-blue-500",
            !canManage && "cursor-not-allowed opacity-50",
          )}
        >
          <Plus size={14} strokeWidth={2.4} /> Adaugă cazare
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={Building2} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Locații" value={kpi.locations} sub={`${kpi.totalPlaces} paturi`} />
        <Kpi icon={Home} tint="bg-emerald-500/12" color="text-emerald-300" label="Disponibile" value={kpi.available} sub={`${kpi.occupiedPct}% ocupare`} />
        <Kpi icon={DoorOpen} tint="bg-violet-500/12" color="text-violet-300" label="Ocupate" value={kpi.occupied} sub="repartizări active" />
        <Kpi icon={Wallet} tint="bg-blue-500/12" color="text-blue-300" label="Venit lunar" value={kpi.monthlyIncome} sub="RON încasat de la curieri" isMoney />
        <Kpi icon={Wallet} tint="bg-rose-500/12" color="text-rose-300" label="Cost lunar" value={kpi.monthlyCost} sub="RON plătit proprietarilor" isMoney />
        <Kpi
          icon={Wrench}
          tint={kpi.monthlyProfit >= 0 ? "bg-emerald-500/12" : "bg-amber-500/12"}
          color={kpi.monthlyProfit >= 0 ? "text-emerald-300" : "text-amber-300"}
          label="Profit / lună"
          value={kpi.monthlyProfit}
          sub={kpi.contractsExpiringSoon > 0 ? `${kpi.contractsExpiringSoon} contracte expiră` : "OK"}
          isMoney
        />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după nume, adresă, oraș, proprietar..."
              className="w-full rounded-lg border border-line bg-card-2 py-2 pl-8 pr-3 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AccommodationType | "all")} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none">
            <option value="all">Toate tipurile</option>
            {(Object.keys(ACCOMMODATION_TYPE_LABEL) as AccommodationType[]).map((t) => (
              <option key={t} value={t}>{ACCOMMODATION_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AccommodationStatus | "all")} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none">
            <option value="all">Toate stările</option>
            {(Object.keys(ACCOMMODATION_STATUS_LABEL) as AccommodationStatus[]).map((s) => (
              <option key={s} value={s}>{ACCOMMODATION_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none">
            <option value="all">Toate orașele</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="ml-auto text-[12px] text-fg-dim">
            {filtered.length} {filtered.length === 1 ? "cazare" : "cazări"}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {!hydrated ? (
          <div className="p-8 text-center text-[13px] text-fg-muted">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={fleetAccommodations.length > 0} onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-dim">
                  <th className="px-4 py-3">Locație</th>
                  <th className="w-[110px] px-2 py-3">Tip</th>
                  <th className="w-[140px] px-2 py-3">Status</th>
                  <th className="w-[110px] px-2 py-3 text-center">Ocupare</th>
                  <th className="w-[130px] px-2 py-3 text-right">Venit / lună</th>
                  <th className="w-[130px] px-2 py-3 text-right">Cost / lună</th>
                  <th className="w-[130px] px-2 py-3">Contract</th>
                  <th className="w-[80px] px-2 py-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const active = activeAssignmentsOf(a.id);
                  const occ = active.length;
                  const income = active.reduce((s, r) => s + r.monthlyRateRon, 0);
                  const cost = a.monthlyRentToOwnerRon ?? 0;
                  const contractDays = daysUntil(a.contractEndIso);
                  const contractSoon = contractDays !== null && contractDays >= 0 && contractDays < 45;
                  const contractExpired = contractDays !== null && contractDays < 0;
                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer border-b border-line/60 transition-colors hover:bg-white/[0.02]"
                      onClick={() => setDrawerFor(a)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card-hover text-fg-muted">
                            <Building2 size={16} />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-fg">{a.name}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-fg-muted">{a.city} · {a.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-fg-muted">{ACCOMMODATION_TYPE_LABEL[a.type]}</td>
                      <td className="px-2 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold", ACCOMMODATION_STATUS_STYLE[a.status])}>
                          <span className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            a.status === "active" && "bg-emerald-400",
                            a.status === "service" && "bg-amber-400",
                            a.status === "retired" && "bg-fg-dim",
                          )} />
                          {ACCOMMODATION_STATUS_LABEL[a.status]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={cn("font-mono tabular-nums", occ >= a.totalPlaces ? "text-amber-300" : "text-fg")}>
                          {occ} / {a.totalPlaces}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-emerald-300">
                        {income > 0 ? formatRon(income) : <span className="text-fg-dim">—</span>}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-fg-muted">
                        {cost > 0 ? formatRon(cost) : <span className="text-fg-dim">—</span>}
                      </td>
                      <td className="px-2 py-3">
                        {a.contractEndIso ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={cn(
                              "text-[11px]",
                              contractExpired ? "font-semibold text-rose-300"
                              : contractSoon ? "text-amber-300"
                              : "text-fg-muted",
                            )}>
                              expiră {fmt(a.contractEndIso)}
                            </span>
                            {contractSoon && !contractExpired && (
                              <span className="text-[10px] text-amber-300/80">în {contractDays} zile</span>
                            )}
                            {contractExpired && (
                              <span className="text-[10px] text-rose-300/80">acum {Math.abs(contractDays!)} zile</span>
                            )}
                          </div>
                        ) : (
                          <Badge tone="neutral">Fără contract</Badge>
                        )}
                      </td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {a.status === "active" && occ < a.totalPlaces && (
                            <button
                              type="button"
                              onClick={() => setAssignFor(a)}
                              className="rounded-md bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
                              title="Repartizează curier"
                            >
                              + Curier
                            </button>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId((p) => p === a.id ? null : a.id); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.06] hover:text-fg"
                              aria-label="Mai multe acțiuni"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpenId === a.id && (
                              <div
                                className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-card shadow-2xl"
                                onMouseLeave={() => setMenuOpenId(null)}
                              >
                                {a.status !== "service" && occ === 0 && (
                                  <MenuItem label="Trimite în renovare" onClick={() => { sendToService(a.id); setMenuOpenId(null); toast.info("Renovare", a.name); }} />
                                )}
                                {a.status === "service" && (
                                  <MenuItem label="Marchează operațională" onClick={() => { markActive(a.id); setMenuOpenId(null); toast.success("Reactivată", a.name); }} />
                                )}
                                {a.status !== "retired" && occ === 0 && (
                                  <MenuItem label="Retrage" onClick={() => { retireAccommodation(a.id); setMenuOpenId(null); toast.info("Retrasă", a.name); }} />
                                )}
                                <div className="my-1 h-px bg-line" />
                                <MenuItem
                                  label="Șterge definitiv"
                                  danger
                                  onClick={() => { setMenuOpenId(null); handleDelete(a); }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddAccommodationDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AssignCourierDialog accommodation={assignFor} onClose={() => setAssignFor(null)} />
      <EndAssignmentDialog
        accommodation={endFor?.acc ?? null}
        assignment={endFor ? (historyOf(endFor.acc.id).find((r) => r.id === endFor.assignmentId) ?? null) : null}
        onClose={() => setEndFor(null)}
      />
      {drawerFor && (
        <AccDrawer
          accommodation={drawerFor}
          onClose={() => setDrawerFor(null)}
          onEndAssignment={(assignmentId) => setEndFor({ acc: drawerFor, assignmentId })}
          onAssign={() => { setAssignFor(drawerFor); }}
        />
      )}

      {/* silențioase — folosite doar când sunt necesare */}
      <span className="hidden">{occupiedCount(fleetAccommodations[0]?.id ?? "_")}</span>
    </div>
  );
}

function Kpi({ icon: Icon, tint, color, label, value, sub, isMoney }: {
  icon: LucideIcon; tint: string; color: string; label: string; value: number; sub?: string; isMoney?: boolean;
}) {
  return (
    <Card className="min-w-0 p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tint)}>
        <Icon size={17} className={color} />
      </span>
      <div className="mt-3 truncate text-[12px] font-medium text-fg-muted">{label}</div>
      <div className="mt-0.5 truncate text-[19px] font-bold tabular-nums text-fg">
        {isMoney ? formatRon(value) : formatInt(value)}
      </div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-fg-dim">{sub}</div>}
    </Card>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center px-3 py-2 text-left text-[12.5px]",
        danger ? "text-rose-300 hover:bg-rose-500/10" : "text-fg hover:bg-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-300">
        <Building2 size={22} />
      </span>
      <div className="text-[15px] font-semibold text-fg">
        {hasAny ? "Nicio cazare cu aceste filtre" : "Niciun spațiu de cazare încă"}
      </div>
      <p className="max-w-md text-[12.5px] text-fg-muted">
        {hasAny
          ? "Schimbă filtrele sau caută altceva."
          : "Adaugă primul spațiu de cazare. După aceea repartizezi curieri pe paturi și ții evidența încasărilor lunare."}
      </p>
      {!hasAny && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          <Plus size={14} /> Adaugă prima cazare
        </button>
      )}
    </div>
  );
}

const DRAWER_TABS = [["info", "Info"], ["couriers", "Curieri"], ["history", "Istoric"]] as const;

function AccDrawer({ accommodation, onClose, onEndAssignment, onAssign }: {
  accommodation: Accommodation;
  onClose: () => void;
  onEndAssignment: (assignmentId: string) => void;
  onAssign: () => void;
}) {
  const { activeAssignmentsOf, historyOf, occupiedCount } = useAccommodations();
  const [tab, setTab] = useState<(typeof DRAWER_TABS)[number][0]>("info");
  const active = activeAssignmentsOf(accommodation.id);
  const all = historyOf(accommodation.id);
  const occ = occupiedCount(accommodation.id);
  const free = accommodation.totalPlaces - occ;
  const income = active.reduce((s, r) => s + r.monthlyRateRon, 0);
  const totalCollected = all.reduce((s, r) => s + r.totalCollectedRon, 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-semibold text-fg">Detalii cazare</span>
          <button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative m-3 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-900/60">
            <Building2 size={40} className="text-fg-dim" />
            <span className={cn("absolute left-2 top-2 rounded-md border px-2 py-0.5 text-[11px] font-medium", ACCOMMODATION_STATUS_STYLE[accommodation.status])}>
              {ACCOMMODATION_STATUS_LABEL[accommodation.status]}
            </span>
            <span className="absolute right-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] font-mono text-white">
              {occ}/{accommodation.totalPlaces}
            </span>
          </div>

          <div className="px-4">
            <div className="text-[15px] font-bold text-fg">{accommodation.name}</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">{accommodation.city} · {accommodation.address}</div>
          </div>

          <div className="flex items-center gap-1 border-b border-line px-3 pt-3">
            {DRAWER_TABS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn("relative px-2.5 py-2 text-[12.5px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}
              >
                {l}
                {k === "couriers" && ` (${active.length})`}
                {k === "history" && ` (${all.length})`}
                {tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 px-4 py-3 text-[12.5px]">
              <Info label="Tip" value={ACCOMMODATION_TYPE_LABEL[accommodation.type]} />
              <Info label="Locuri" value={`${accommodation.totalPlaces}`} />
              <Info label="Ocupate" value={`${occ}`} />
              <Info label="Disponibile" value={`${free}`} />
              <Info label="Venit lunar" value={income > 0 ? formatRon(income) : "—"} />
              <Info label="Cost lunar" value={accommodation.monthlyRentToOwnerRon ? formatRon(accommodation.monthlyRentToOwnerRon) : "—"} />
              <Info label="Proprietar" value={accommodation.ownerName || "—"} />
              <Info label="Contact" value={accommodation.ownerPhone || "—"} />
              <Info label="Contract start" value={fmt(accommodation.contractStartIso)} />
              <Info label="Contract expiră" value={fmt(accommodation.contractEndIso)} />
              {accommodation.facilities.length > 0 && (
                <div className="col-span-2">
                  <div className="text-[11px] text-fg-dim">Dotări</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {accommodation.facilities.map((f) => (
                      <span key={f} className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] text-fg-muted">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {accommodation.notes && (
                <div className="col-span-2">
                  <div className="text-[11px] text-fg-dim">Note</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-[12px] text-fg">{accommodation.notes}</div>
                </div>
              )}
            </div>
          )}

          {tab === "couriers" && (
            <div className="p-3">
              {active.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line/50 p-6 text-center text-[12px] text-fg-muted">
                  Nimeni repartizat aici încă.
                </div>
              ) : (
                <ul className="space-y-2">
                  {active.map((r) => (
                    <li key={r.id} className="rounded-lg border border-violet-500/40 bg-violet-500/[0.05] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-fg">{r.courierName}</div>
                          <div className="mt-0.5 text-[10.5px] text-fg-dim">de la {fmt(r.startDateIso)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEndAssignment(r.id)}
                          className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                        >
                          Închide
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
                        <div>
                          <div className="text-fg-dim">Tarif</div>
                          <div className="font-mono font-semibold text-fg">{formatRon(r.monthlyRateRon)}/lună</div>
                        </div>
                        <div>
                          <div className="text-fg-dim">Încasat</div>
                          <div className="font-mono font-semibold text-emerald-300">{formatRon(r.totalCollectedRon)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {free > 0 && accommodation.status === "active" && (
                <button
                  type="button"
                  onClick={onAssign}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-2 text-[12.5px] font-semibold text-white"
                >
                  <Plus size={13} /> Repartizează curier ({free} {free === 1 ? "loc" : "locuri"})
                </button>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="p-3">
              {all.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line/50 p-6 text-center text-[12px] text-fg-muted">
                  Fără istoric.
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between text-[11.5px] text-fg-muted">
                    <span>{all.length} {all.length === 1 ? "repartizare" : "repartizări"}</span>
                    <span className="font-mono tabular-nums">Total încasat: <b className="text-fg">{formatRon(totalCollected)}</b></span>
                  </div>
                  <ul className="space-y-2">
                    {all.map((r) => (
                      <li key={r.id} className={cn(
                        "rounded-lg border p-3",
                        r.status === "active" ? "border-violet-500/40 bg-violet-500/[0.05]" : "border-line bg-card-2",
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-fg">{r.courierName}</div>
                            <div className="mt-0.5 text-[10.5px] text-fg-dim">
                              {fmt(r.startDateIso)} — {r.endDateIso ? fmt(r.endDateIso) : "în desfășurare"}
                            </div>
                          </div>
                          <Badge tone={r.status === "active" ? "info" : "neutral"}>
                            {r.status === "active" ? "Activă" : "Încheiată"}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
                          <div>
                            <div className="text-fg-dim">Tarif</div>
                            <div className="font-mono font-semibold text-fg">{formatRon(r.monthlyRateRon)}/lună</div>
                          </div>
                          <div>
                            <div className="text-fg-dim">Încasat</div>
                            <div className="font-mono font-semibold text-emerald-300">{formatRon(r.totalCollectedRon)}</div>
                          </div>
                        </div>
                        {r.endedReason && (
                          <div className="mt-2 text-[10.5px] text-fg-dim">
                            Motiv plecare: <span className="text-fg-muted">{r.endedReason}</span>
                          </div>
                        )}
                        {r.notes && <div className="mt-1 whitespace-pre-wrap text-[10.5px] text-fg-dim">{r.notes}</div>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-fg-dim">{label}</div>
      <div className="mt-0.5 truncate font-medium text-fg">{value}</div>
    </div>
  );
}
