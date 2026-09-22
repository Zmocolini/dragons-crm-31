"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useAccommodations } from "@/lib/accommodations/context";
import type { Accommodation } from "@/lib/accommodations/types";
import { todayIsoLocal } from "@/lib/accommodations/types";
import { cn } from "@/lib/utils/cn";

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";

export function AssignCourierDialog({ accommodation, onClose }: { accommodation: Accommodation | null; onClose: () => void }) {
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { assignCourier, activeAssignmentsOf, occupiedCount } = useAccommodations();
  const toast = useToast();

  const [courierId, setCourierId] = useState("");
  const [startDate, setStartDate] = useState(todayIsoLocal());
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");

  const already = useMemo(
    () => accommodation ? new Set(activeAssignmentsOf(accommodation.id).map((r) => r.courierId)) : new Set<string>(),
    [accommodation, activeAssignmentsOf],
  );

  const eligibleCouriers = useMemo(() => {
    const rank = (s: string) => s === "active" ? 0 : s === "in_activation" ? 1 : s === "paused" ? 2 : s === "draft" ? 3 : 4;
    return allRows
      .filter((c) => c.tenantId === activeFleetId && c.status !== "stopped")
      .filter((c) => !already.has(c.id))
      .sort((a, b) => rank(a.status) - rank(b.status) || a.fullName.localeCompare(b.fullName));
  }, [allRows, activeFleetId, already]);

  if (!accommodation) return null;

  const occupied = occupiedCount(accommodation.id);
  const free = accommodation.totalPlaces - occupied;

  function submit() {
    if (!accommodation) return;
    if (free <= 0) {
      toast.error("Locație plină", "Toate paturile sunt ocupate. Încheie o repartizare mai întâi.");
      return;
    }
    const parsedRate = Number(rate.replace(",", "."));
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Tarif invalid", "Introdu o sumă pozitivă în RON.");
      return;
    }
    const courier = eligibleCouriers.find((c) => c.id === courierId);
    if (!courier) {
      toast.error("Selectează un curier", "Alege un curier eligibil.");
      return;
    }
    const assign = assignCourier({
      accommodationId: accommodation.id,
      courierId: courier.id,
      courierName: courier.fullName,
      startDateIso: startDate || todayIsoLocal(),
      monthlyRateRon: Math.round(parsedRate * 100) / 100,
      notes: notes.trim() || null,
    }, user.name);
    if (!assign) {
      toast.error("Repartizare eșuată", "Verifică capacitatea sau dacă curierul e deja cazat aici.");
      return;
    }
    toast.success("Curier repartizat", `${courier.fullName} → ${accommodation.name} · ${parsedRate} RON/lună.`);
    setCourierId(""); setRate(""); setNotes("");
    onClose();
  }

  return (
    <Dialog
      open={!!accommodation}
      onClose={onClose}
      title={`Repartizează în ${accommodation.name}`}
      description={`${accommodation.city} · ${occupied}/${accommodation.totalPlaces} locuri ocupate · ${free} disponibile`}
      size="md"
    >
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
              Toți curierii sunt deja repartizați aici sau flota e goală. Adaugă unul la /curieri.
            </p>
          )}
        </F>

        <div className="grid grid-cols-2 gap-3">
          <F label="Data start">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
          </F>
          <F label="Tarif RON / lună">
            <input type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="800" className={inp} />
          </F>
        </div>

        <F label="Note (opțional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Cameră alocată, cauțiune, reguli speciale..." className={cn(inp, "resize-none")} />
        </F>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!courierId || eligibleCouriers.length === 0 || free <= 0}
          className={cn(
            "rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500",
            (!courierId || eligibleCouriers.length === 0 || free <= 0) && "cursor-not-allowed opacity-50",
          )}
        >
          Repartizează
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
