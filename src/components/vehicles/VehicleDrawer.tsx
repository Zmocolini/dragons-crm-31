"use client";

import { useMemo, useState } from "react";
import { Car, Copy, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { useVehicles } from "@/lib/vehicles/context";
import {
  FLEET_VEHICLE_TYPE_LABEL, FUEL_LABEL, VEHICLE_STATUS_LABEL,
  daysUntil, type FleetVehicle,
} from "@/lib/vehicles/types";
import { cn } from "@/lib/utils/cn";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
function formatRon(n: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Math.round(n))} RON`;
}

const TABS = [["info", "Info"], ["rentals", "Închirieri"]] as const;
type Tab = (typeof TABS)[number][0];

export function VehicleDrawer({ vehicle, onClose }: { vehicle: FleetVehicle; onClose: () => void }) {
  const toast = useToast();
  const { rentalHistoryOf } = useVehicles();
  const [tab, setTab] = useState<Tab>("info");

  const rentals = useMemo(() => rentalHistoryOf(vehicle.id), [rentalHistoryOf, vehicle.id]);
  const totalCollected = rentals.reduce((s, r) => s + r.totalCollectedRon, 0);

  const itpDays = daysUntil(vehicle.itpExpiryIso);
  const insDays = daysUntil(vehicle.insuranceExpiryIso);
  const itpTone = itpDays === null ? undefined : itpDays < 0 ? "danger" : itpDays < 30 ? "warn" : "success";
  const insTone = insDays === null ? undefined : insDays < 0 ? "danger" : insDays < 30 ? "warn" : "success";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-semibold text-fg">Detalii vehicul</span>
          <button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative m-3 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-900/60">
            <Car size={48} className="text-fg-dim" />
            <span className="absolute left-2 top-2 rounded-md border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
              {VEHICLE_STATUS_LABEL[vehicle.status]}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2 px-4">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-fg">{vehicle.brand} {vehicle.model}</div>
              <div className="text-[12px] text-fg-muted">{FLEET_VEHICLE_TYPE_LABEL[vehicle.type]}{vehicle.year ? ` · ${vehicle.year}` : ""}</div>
            </div>
            <span className="rounded-md border border-line bg-card-hover px-2 py-1 text-[12px] font-bold tabular-nums text-fg">{vehicle.label}</span>
          </div>

          <div className="flex items-center gap-1 border-b border-line px-3 pt-3">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "relative px-2.5 py-2 text-[12.5px] font-medium",
                  tab === k ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {l}
                {tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 px-4 py-3">
              <Info label="Culoare" value={vehicle.color || "—"} />
              <Info label="Combustibil" value={vehicle.fuel ? FUEL_LABEL[vehicle.fuel] : "—"} />
              {vehicle.vin ? (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(vehicle.vin ?? ""); toast.success("Copiat", "VIN copiat în clipboard."); }}
                  className="col-span-2 text-left"
                >
                  <div className="text-[11px] text-fg-dim">VIN / Serie</div>
                  <div className="mt-0.5 flex items-center gap-1 font-mono text-[11.5px] font-medium text-fg">
                    <span className="truncate">{vehicle.vin}</span>
                    <Copy size={11} className="text-fg-dim" />
                  </div>
                </button>
              ) : (
                <Info label="VIN / Serie" value="—" />
              )}
              <Info label="Achiziționat" value={fmt(vehicle.purchaseDateIso)} />
              <Info label="Preț achiziție" value={vehicle.purchasePriceRon ? formatRon(vehicle.purchasePriceRon) : "—"} />
              {(vehicle.itpExpiryIso || vehicle.insuranceExpiryIso) && (
                <>
                  <div>
                    <div className="text-[11px] text-fg-dim">ITP</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-[12.5px] font-medium text-fg">{fmt(vehicle.itpExpiryIso)}</span>
                      {itpTone && <Badge tone={itpTone}>{itpDays! < 0 ? "expirat" : `${itpDays} zile`}</Badge>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-fg-dim">RCA</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-[12.5px] font-medium text-fg">{fmt(vehicle.insuranceExpiryIso)}</span>
                      {insTone && <Badge tone={insTone}>{insDays! < 0 ? "expirat" : `${insDays} zile`}</Badge>}
                    </div>
                  </div>
                </>
              )}
              {vehicle.notes && (
                <div className="col-span-2">
                  <div className="text-[11px] text-fg-dim">Note</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-[12px] text-fg">{vehicle.notes}</div>
                </div>
              )}
            </div>
          )}

          {tab === "rentals" && (
            <div className="p-3">
              {rentals.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line/50 p-6 text-center text-[12px] text-fg-muted">
                  Nicio închiriere încă. Închiriază vehiculul din listă.
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between text-[11.5px] text-fg-muted">
                    <span>{rentals.length} {rentals.length === 1 ? "închiriere" : "închirieri"}</span>
                    <span className="font-mono tabular-nums">Total încasat: <b className="text-fg">{formatRon(totalCollected)}</b></span>
                  </div>
                  <ul className="space-y-2">
                    {rentals.map((r) => (
                      <li key={r.id} className={cn(
                        "rounded-lg border p-3",
                        r.status === "active"
                          ? "border-violet-500/40 bg-violet-500/[0.05]"
                          : "border-line bg-card-2",
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
                            <div className="font-mono font-semibold text-fg">{formatRon(r.weeklyRateRon)}/săpt.</div>
                          </div>
                          <div>
                            <div className="text-fg-dim">Încasat</div>
                            <div className="font-mono font-semibold text-emerald-300">{formatRon(r.totalCollectedRon)}</div>
                          </div>
                        </div>
                        {r.endedReason && (
                          <div className="mt-2 text-[10.5px] text-fg-dim">
                            Motiv retur: <span className="text-fg-muted">{r.endedReason}</span>
                          </div>
                        )}
                        {r.notes && (
                          <div className="mt-1 whitespace-pre-wrap text-[10.5px] text-fg-dim">{r.notes}</div>
                        )}
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
      <div className="mt-0.5 truncate text-[12.5px] font-medium text-fg">{value}</div>
    </div>
  );
}
