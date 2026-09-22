"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useSession } from "@/lib/rbac/session";
import { useAccommodations } from "@/lib/accommodations/context";
import {
  ACCOMMODATION_TYPE_LABEL, type AccommodationType,
} from "@/lib/accommodations/types";
import { cn } from "@/lib/utils/cn";

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";
const FACILITY_OPTIONS = ["Wi-Fi", "Mașină de spălat", "Bucătărie", "AC", "Parcare", "TV", "Frigider", "Cuptor", "Balcon", "Curte"];

export function AddAccommodationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, activeFleetId } = useSession();
  const { addAccommodation } = useAccommodations();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<AccommodationType>("apartment");
  const [totalPlaces, setTotalPlaces] = useState("4");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  function toggleFacility(f: string) {
    setFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  function reset() {
    setName(""); setCity(""); setAddress(""); setType("apartment");
    setTotalPlaces("4"); setMonthlyRent(""); setOwnerName(""); setOwnerPhone("");
    setContractStart(""); setContractEnd(""); setFacilities([]); setNotes("");
  }

  function submit() {
    const parsedPlaces = Number(totalPlaces);
    const parsedRent = monthlyRent.trim() ? Number(monthlyRent.replace(",", ".")) : null;
    addAccommodation({
      tenantId: activeFleetId,
      name: name.trim() || "Cazare fără nume",
      city: city.trim() || "—",
      address: address.trim() || "—",
      type,
      totalPlaces: Number.isFinite(parsedPlaces) && parsedPlaces > 0 ? parsedPlaces : 1,
      monthlyRentToOwnerRon: Number.isFinite(parsedRent) && (parsedRent as number) > 0 ? parsedRent : null,
      ownerName: ownerName.trim() || null,
      ownerPhone: ownerPhone.trim() || null,
      contractStartIso: contractStart || null,
      contractEndIso: contractEnd || null,
      facilities,
      notes: notes.trim() || null,
      createdBy: user.name,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Adaugă cazare" description="Adaugă o locație nouă în inventar." size="lg">
      <div className="grid grid-cols-2 gap-3">
        <F label="Denumire" full>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dragon Residence #1" className={inp} />
        </F>
        <F label="Tip">
          <select value={type} onChange={(e) => setType(e.target.value as AccommodationType)} className={inp}>
            {(Object.keys(ACCOMMODATION_TYPE_LABEL) as AccommodationType[]).map((t) => (
              <option key={t} value={t} className="bg-card">{ACCOMMODATION_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </F>
        <F label="Capacitate (paturi)">
          <input type="number" min={1} value={totalPlaces} onChange={(e) => setTotalPlaces(e.target.value)} className={inp} />
        </F>

        <F label="Oraș">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="București" className={inp} />
        </F>
        <F label="Adresă completă" full>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Str. X nr. 12, ap. 3" className={inp} />
        </F>

        <F label="Chirie lunară plătită proprietarului (RON)">
          <input type="number" min={0} value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="Lasă gol dacă e proprie" className={inp} />
        </F>
        <F label="Proprietar (nume)">
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inp} />
        </F>
        <F label="Telefon proprietar">
          <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+40 7XX XXX XXX" className={inp} />
        </F>
        <F label="Contract — start">
          <input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
        </F>
        <F label="Contract — expirare">
          <input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
        </F>

        <F label="Dotări" full>
          <div className="flex flex-wrap gap-1.5">
            {FACILITY_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFacility(f)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                  facilities.includes(f)
                    ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                    : "border-line bg-card text-fg-muted hover:bg-card-hover hover:text-fg",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </F>

        <F label="Note" full>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reguli, observații..." className={cn(inp, "resize-none")} />
        </F>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button type="button" onClick={submit} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500">
          Adaugă
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={cn("block", full && "col-span-2")}>
      <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
