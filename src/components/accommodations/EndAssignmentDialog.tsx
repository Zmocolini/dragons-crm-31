"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useAccommodations } from "@/lib/accommodations/context";
import type { Accommodation, AccommodationAssignment } from "@/lib/accommodations/types";
import { todayIsoLocal } from "@/lib/accommodations/types";
import { cn } from "@/lib/utils/cn";

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";

type Props = {
  accommodation: Accommodation | null;
  assignment: AccommodationAssignment | null;
  onClose: () => void;
};

export function EndAssignmentDialog({ accommodation, assignment, onClose }: Props) {
  const { user } = useSession();
  const { endAssignment } = useAccommodations();
  const toast = useToast();

  const [endDate, setEndDate] = useState(todayIsoLocal());
  const [reason, setReason] = useState("plecat");
  const [notes, setNotes] = useState("");

  if (!accommodation || !assignment) return null;

  function submit() {
    if (!assignment || !accommodation) return;
    endAssignment({
      assignmentId: assignment.id,
      endDateIso: endDate || todayIsoLocal(),
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    }, user.name);
    toast.success("Repartizare încheiată", `${assignment.courierName} a plecat din ${accommodation.name}.`);
    setEndDate(todayIsoLocal()); setReason("plecat"); setNotes("");
    onClose();
  }

  return (
    <Dialog
      open={!!(accommodation && assignment)}
      onClose={onClose}
      title="Încheie repartizare"
      description={`${assignment.courierName} — ${accommodation.name}`}
      size="md"
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <F label="Data plecării">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
          </F>
          <F label="Motiv">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inp}>
              <option value="plecat" className="bg-card">Plecat normal</option>
              <option value="schimbat_cazare" className="bg-card">Schimbat cazarea</option>
              <option value="incetat_activitate" className="bg-card">Încetat activitate</option>
              <option value="evacuat" className="bg-card">Evacuat</option>
              <option value="alt" className="bg-card">Alt motiv</option>
            </select>
          </F>
        </div>
        <F label="Note (stare cameră, taxe rămase, etc.)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ex: A lăsat cameră curată. Cauțiune returnată." className={cn(inp, "resize-none")} />
        </F>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button type="button" onClick={submit} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-emerald-500 hover:to-emerald-400">
          Confirmă plecarea
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
