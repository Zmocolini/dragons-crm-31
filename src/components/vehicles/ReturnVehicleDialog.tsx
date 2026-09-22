"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useVehicles } from "@/lib/vehicles/context";
import type { FleetVehicle, VehicleRental } from "@/lib/vehicles/types";
import { todayIsoLocal } from "@/lib/vehicles/types";
import { cn } from "@/lib/utils/cn";

type Props = {
  vehicle: FleetVehicle | null;
  rental: VehicleRental | null;
  onClose: () => void;
};

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";

export function ReturnVehicleDialog({ vehicle, rental, onClose }: Props) {
  const { user } = useSession();
  const { endRental } = useVehicles();
  const toast = useToast();

  const [endDate, setEndDate] = useState(todayIsoLocal());
  const [reason, setReason] = useState("returnat");
  const [notes, setNotes] = useState("");

  if (!vehicle || !rental) return null;

  function submit() {
    if (!rental || !vehicle) return;
    endRental({
      rentalId: rental.id,
      endDateIso: endDate || todayIsoLocal(),
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    }, user.name);
    toast.success("Vehicul returnat", `${vehicle.label} este disponibil din nou.`);
    setEndDate(todayIsoLocal()); setReason("returnat"); setNotes("");
    onClose();
  }

  return (
    <Dialog open={!!(vehicle && rental)} onClose={onClose} title={`Returnează ${vehicle.label}`} description={`Închiriat lui ${rental.courierName}`} size="md">
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <F label="Data retur">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
          </F>
          <F label="Motiv">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inp}>
              <option value="returnat" className="bg-card">Returnat normal</option>
              <option value="reparatie" className="bg-card">Trimis în reparație</option>
              <option value="schimbat" className="bg-card">Schimbat cu alt vehicul</option>
              <option value="pierdut" className="bg-card">Pierdut / Furat</option>
              <option value="vandut" className="bg-card">Vândut</option>
              <option value="alt" className="bg-card">Alt motiv</option>
            </select>
          </F>
        </div>
        <F label="Note (condiție retur, taxe, etc.)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ex: Curier a returnat cu zgârietură pe partea dreaptă." className={cn(inp, "resize-none")} />
        </F>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button type="button" onClick={submit} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-emerald-500 hover:to-emerald-400">
          Confirmă returul
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
