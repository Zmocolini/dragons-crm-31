"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useVehicles } from "@/lib/vehicles/context";
import type { FleetVehicle } from "@/lib/vehicles/types";
import { todayIsoLocal } from "@/lib/vehicles/types";
import { cn } from "@/lib/utils/cn";

type Props = { vehicle: FleetVehicle | null; onClose: () => void };

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";

export function RentVehicleDialog({ vehicle, onClose }: Props) {
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { startRental } = useVehicles();
  const toast = useToast();

  const [courierId, setCourierId] = useState("");
  const [startDate, setStartDate] = useState(todayIsoLocal());
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");

  // Includ toți curierii flotei, minus cei „stopped" (nu mai lucrează).
  // Sortez cu activi primii ca să-i găsești rapid.
  const eligibleCouriers = useMemo(() => {
    const rank = (s: string) => s === "active" ? 0 : s === "in_activation" ? 1 : s === "paused" ? 2 : s === "draft" ? 3 : 4;
    return allRows
      .filter((c) => c.tenantId === activeFleetId && c.status !== "stopped")
      .sort((a, b) => rank(a.status) - rank(b.status) || a.fullName.localeCompare(b.fullName));
  }, [allRows, activeFleetId]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    const parsedRate = Number(rate.replace(",", "."));
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Tarif invalid", "Introdu o sumă pozitivă în RON.");
      return;
    }
    const courier = eligibleCouriers.find((c) => c.id === courierId);
    if (!courier) {
      toast.error("Selectează un curier", "Alege un curier eligibil din listă.");
      return;
    }
    const rental = startRental({
      vehicleId: vehicle.id,
      courierId: courier.id,
      courierName: courier.fullName,
      startDateIso: startDate || todayIsoLocal(),
      weeklyRateRon: Math.round(parsedRate * 100) / 100,
      notes: notes.trim() || null,
    }, user.name);
    if (!rental) {
      toast.error("Nu se poate închiria", "Vehiculul nu e disponibil (deja închiriat sau retras).");
      return;
    }
    toast.success("Vehicul închiriat", `${vehicle.label} → ${courier.fullName} · ${parsedRate} RON/săpt.`);
    setCourierId(""); setRate(""); setNotes("");
    onClose();
  }

  return (
    <Dialog open={!!vehicle} onClose={onClose} title={`Închiriază ${vehicle.label}`} description={`${vehicle.brand} ${vehicle.model}`} size="md">
      <div className="grid grid-cols-1 gap-3">
        <F label="Curier">
          <select value={courierId} onChange={(e) => setCourierId(e.target.value)} className={inp}>
            <option value="" className="bg-card">Selectează curier… ({eligibleCouriers.length} disponibili)</option>
            {eligibleCouriers.map((c) => {
              const statusLabel = c.status === "active" ? "activ"
                : c.status === "in_activation" ? "în activare"
                : c.status === "paused" ? "pauzat"
                : c.status === "draft" ? "ciornă"
                : c.status;
              return (
                <option key={c.id} value={c.id} className="bg-card">
                  {c.fullName} · {c.city || "—"} [{statusLabel}]
                </option>
              );
            })}
          </select>
          {eligibleCouriers.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-300">
              Nu ai curieri în flotă. Adaugă unul la /curieri sau importă un raport pe /plati.
            </p>
          )}
        </F>

        <div className="grid grid-cols-2 gap-3">
          <F label="Data start">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
          </F>
          <F label="Tarif RON / săptămână">
            <input type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="200" className={inp} />
          </F>
        </div>

        <F label="Note (opțional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Condiții, cauțiune, etc." className={cn(inp, "resize-none")} />
        </F>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!courierId || eligibleCouriers.length === 0}
          className={cn(
            "rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500",
            (!courierId || eligibleCouriers.length === 0) && "cursor-not-allowed opacity-50",
          )}
        >
          Închiriază
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
