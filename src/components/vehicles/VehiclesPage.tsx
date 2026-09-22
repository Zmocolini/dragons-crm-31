"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, Bike, Car, CheckCircle2, MoreHorizontal, Plus, Search, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useVehicles, computeFleetVehicleKpi } from "@/lib/vehicles/context";
import {
  FLEET_VEHICLE_TYPE_LABEL, VEHICLE_STATUS_LABEL, VEHICLE_STATUS_STYLE,
  daysUntil,
  type FleetVehicle, type FleetVehicleStatus, type FleetVehicleType,
} from "@/lib/vehicles/types";
import { formatInt } from "@/lib/reports/analytics";
import { cn } from "@/lib/utils/cn";
import { AddVehicleDialog } from "./AddVehicleDialog";
import { RentVehicleDialog } from "./RentVehicleDialog";
import { ReturnVehicleDialog } from "./ReturnVehicleDialog";
import { VehicleDrawer } from "./VehicleDrawer";

const VEHICLE_ICON: Record<FleetVehicleType, LucideIcon> = {
  bike: Bike, e_bike: Bike, scooter: Bike, car: Car, van: Car,
};

function formatRon(n: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Math.round(n))} RON`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function VehiclesPage() {
  const { can } = useSession();
  const toast = useToast();
  const {
    hydrated, fleetVehicles, fleetRentals,
    activeRentalOf, deleteVehicle, sendToService, markAvailable, retireVehicle,
  } = useVehicles();

  const canManage = can("vehicles.manage") || can("vehicles.view");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FleetVehicleType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FleetVehicleStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [rentFor, setRentFor] = useState<FleetVehicle | null>(null);
  const [returnFor, setReturnFor] = useState<FleetVehicle | null>(null);
  const [drawerFor, setDrawerFor] = useState<FleetVehicle | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const kpi = useMemo(() => computeFleetVehicleKpi(fleetVehicles, fleetRentals), [fleetVehicles, fleetRentals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fleetVehicles.filter((v) => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (q) {
        const hay = `${v.label} ${v.brand} ${v.model} ${v.vin ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fleetVehicles, search, typeFilter, statusFilter]);

  function handleDelete(v: FleetVehicle) {
    if (!window.confirm(`Ștergi definitiv „${v.label}"? Această acțiune nu poate fi anulată.`)) return;
    const res = deleteVehicle(v.id);
    if (res.ok) toast.success("Vehicul șters", v.label);
    else toast.error("Nu se poate șterge", res.reason ?? "Eroare necunoscută.");
  }

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-fg">Vehicule</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Inventarul flotei tale. Urmărește ce ai, ce e închiriat cui și încasările săptămânale din chirii.
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
          <Plus size={14} strokeWidth={2.4} /> Adaugă vehicul
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={Car} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Total flotă" value={kpi.total} sub={`${formatInt(kpi.available)} disponibile`} />
        <Kpi icon={CheckCircle2} tint="bg-emerald-500/12" color="text-emerald-300" label="Disponibile" value={kpi.available} sub="gata de închiriat" />
        <Kpi icon={Car} tint="bg-violet-500/12" color="text-violet-300" label="Închiriate" value={kpi.rented} sub="către curieri" />
        <Kpi icon={Wrench} tint="bg-amber-500/12" color="text-amber-300" label="În service" value={kpi.service} sub={kpi.retired > 0 ? `${kpi.retired} retrase` : "operaționale"} />
        <Kpi icon={Bike} tint="bg-blue-500/12" color="text-blue-300" label="Venit săptămânal" value={kpi.weeklyRentalIncome} sub="RON din chirii active" isMoney />
        <Kpi icon={AlertTriangle} tint="bg-rose-500/12" color="text-rose-300" label="ITP / RCA expiră" value={Math.max(kpi.itpExpiring, kpi.insuranceExpiring)} sub="în ≤ 30 zile" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după label, marcă, model, VIN..."
              className="w-full rounded-lg border border-line bg-card-2 py-2 pl-8 pr-3 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FleetVehicleType | "all")} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none">
            <option value="all">Toate tipurile</option>
            {(Object.keys(FLEET_VEHICLE_TYPE_LABEL) as FleetVehicleType[]).map((t) => (
              <option key={t} value={t}>{FLEET_VEHICLE_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FleetVehicleStatus | "all")} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none">
            <option value="all">Toate stările</option>
            {(Object.keys(VEHICLE_STATUS_LABEL) as FleetVehicleStatus[]).map((s) => (
              <option key={s} value={s}>{VEHICLE_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <div className="ml-auto text-[12px] text-fg-dim">
            {filtered.length} {filtered.length === 1 ? "vehicul" : "vehicule"}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {!hydrated ? (
          <div className="p-8 text-center text-[13px] text-fg-muted">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={fleetVehicles.length > 0} onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-dim">
                  <th className="px-4 py-3">Vehicul</th>
                  <th className="w-[110px] px-2 py-3">Tip</th>
                  <th className="w-[140px] px-2 py-3">Status</th>
                  <th className="px-2 py-3">Închiriat lui</th>
                  <th className="w-[130px] px-2 py-3 text-right">Tarif / săpt.</th>
                  <th className="w-[130px] px-2 py-3 text-right">Încasat total</th>
                  <th className="w-[140px] px-2 py-3">Documente</th>
                  <th className="w-[80px] px-2 py-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const rental = activeRentalOf(v.id);
                  const VIcon = VEHICLE_ICON[v.type];
                  const itpDays = daysUntil(v.itpExpiryIso);
                  const insDays = daysUntil(v.insuranceExpiryIso);
                  const historyForVehicle = fleetRentals.filter((r) => r.vehicleId === v.id);
                  const totalCollected = historyForVehicle.reduce((s, r) => s + r.totalCollectedRon, 0);
                  return (
                    <tr
                      key={v.id}
                      className="cursor-pointer border-b border-line/60 transition-colors hover:bg-white/[0.02]"
                      onClick={() => setDrawerFor(v)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card-hover text-fg-muted">
                            <VIcon size={16} />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[13px] font-semibold uppercase text-fg">{v.label}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-fg-muted">
                              {v.brand} {v.model}
                              {v.year ? ` · ${v.year}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-fg-muted">{FLEET_VEHICLE_TYPE_LABEL[v.type]}</td>
                      <td className="px-2 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold", VEHICLE_STATUS_STYLE[v.status])}>
                          <span className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            v.status === "available" && "bg-emerald-400",
                            v.status === "rented" && "bg-violet-400",
                            v.status === "service" && "bg-amber-400",
                            v.status === "retired" && "bg-fg-dim",
                          )} />
                          {VEHICLE_STATUS_LABEL[v.status]}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {rental ? (
                          <div className="min-w-0 leading-tight">
                            <div className="truncate text-[12.5px] font-medium text-fg">{rental.courierName}</div>
                            <div className="text-[10.5px] text-fg-dim">de la {fmtDate(rental.startDateIso)}</div>
                          </div>
                        ) : (
                          <span className="text-[11.5px] italic text-fg-dim">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums">
                        {rental ? formatRon(rental.weeklyRateRon) : <span className="text-fg-dim">—</span>}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-fg-muted">
                        {totalCollected > 0 ? formatRon(totalCollected) : <span className="text-fg-dim">0 RON</span>}
                      </td>
                      <td className="px-2 py-3">
                        {v.itpExpiryIso || v.insuranceExpiryIso ? (
                          <div className="flex flex-col gap-0.5 text-[10.5px]">
                            {v.itpExpiryIso && (
                              <span className={cn("truncate", itpDays !== null && itpDays < 30 ? "text-rose-300" : "text-fg-muted")}>
                                ITP: {fmtDate(v.itpExpiryIso)}
                              </span>
                            )}
                            {v.insuranceExpiryIso && (
                              <span className={cn("truncate", insDays !== null && insDays < 30 ? "text-rose-300" : "text-fg-muted")}>
                                RCA: {fmtDate(v.insuranceExpiryIso)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge tone="neutral">Neînmatriculat</Badge>
                        )}
                      </td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {v.status === "available" && (
                            <button
                              type="button"
                              onClick={() => setRentFor(v)}
                              className="rounded-md bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
                              title="Închiriază"
                            >
                              Închiriază
                            </button>
                          )}
                          {v.status === "rented" && (
                            <button
                              type="button"
                              onClick={() => setReturnFor(v)}
                              className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                              title="Returnează"
                            >
                              Returnează
                            </button>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId((prev) => prev === v.id ? null : v.id); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.06] hover:text-fg"
                              aria-label="Mai multe acțiuni"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpenId === v.id && (
                              <div
                                className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-card shadow-2xl"
                                onMouseLeave={() => setMenuOpenId(null)}
                              >
                                {v.status !== "service" && v.status !== "rented" && (
                                  <MenuItem label="Trimite în service" onClick={() => { sendToService(v.id, null, "user"); setMenuOpenId(null); toast.info("În service", v.label); }} />
                                )}
                                {v.status === "service" && (
                                  <MenuItem label="Marchează disponibil" onClick={() => { markAvailable(v.id, "user"); setMenuOpenId(null); toast.success("Reactivat", v.label); }} />
                                )}
                                {v.status !== "retired" && v.status !== "rented" && (
                                  <MenuItem label="Retrage din flotă" onClick={() => { retireVehicle(v.id, null, "user"); setMenuOpenId(null); toast.info("Retras", v.label); }} />
                                )}
                                <div className="my-1 h-px bg-line" />
                                <MenuItem
                                  label="Șterge definitiv"
                                  danger
                                  onClick={() => { setMenuOpenId(null); handleDelete(v); }}
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

      <AddVehicleDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <RentVehicleDialog vehicle={rentFor} onClose={() => setRentFor(null)} />
      <ReturnVehicleDialog
        vehicle={returnFor}
        rental={returnFor ? activeRentalOf(returnFor.id) : null}
        onClose={() => setReturnFor(null)}
      />
      {drawerFor && <VehicleDrawer vehicle={drawerFor} onClose={() => setDrawerFor(null)} />}
    </div>
  );
}

function Kpi({ icon: Icon, tint, color, label, value, sub, isMoney }: {
  icon: LucideIcon; tint: string; color: string; label: string; value: number; sub: string; isMoney?: boolean;
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
      <div className="mt-0.5 truncate text-[11.5px] text-fg-dim">{sub}</div>
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
        <Car size={22} />
      </span>
      <div className="text-[15px] font-semibold text-fg">
        {hasAny ? "Niciun vehicul cu aceste filtre" : "Niciun vehicul în inventar încă"}
      </div>
      <p className="max-w-md text-[12.5px] text-fg-muted">
        {hasAny
          ? "Schimbă filtrele sau caută altceva."
          : "Adaugă primul vehicul din flotă. După aceea îl poți închiria unui curier și vei ține istoricul complet aici."}
      </p>
      {!hasAny && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          <Plus size={14} /> Adaugă primul vehicul
        </button>
      )}
    </div>
  );
}
