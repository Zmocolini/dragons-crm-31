"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useSession } from "@/lib/rbac/session";
import { useVehicles } from "@/lib/vehicles/context";
import {
  FLEET_VEHICLE_TYPE_LABEL, FUEL_LABEL, REGISTERED_TYPES,
  type FleetVehicleFuel, type FleetVehicleType,
} from "@/lib/vehicles/types";
import { cn } from "@/lib/utils/cn";

type Props = { open: boolean; onClose: () => void };

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";

export function AddVehicleDialog({ open, onClose }: Props) {
  const { user, activeFleetId } = useSession();
  const { addVehicle } = useVehicles();

  const [label, setLabel] = useState("");
  const [type, setType] = useState<FleetVehicleType>("scooter");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [color, setColor] = useState("");
  const [fuel, setFuel] = useState<FleetVehicleFuel>("petrol");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [itpExpiry, setItpExpiry] = useState("");
  const [insExpiry, setInsExpiry] = useState("");
  const [notes, setNotes] = useState("");

  const needsRegistration = useMemo(() => REGISTERED_TYPES.includes(type), [type]);

  function reset() {
    setLabel(""); setType("scooter"); setBrand(""); setModel(""); setYear("");
    setVin(""); setColor(""); setFuel("petrol"); setPurchaseDate(""); setPurchasePrice("");
    setItpExpiry(""); setInsExpiry(""); setNotes("");
  }

  function submit() {
    const parsedYear = year.trim() ? Number(year) : null;
    const parsedPrice = purchasePrice.trim() ? Number(purchasePrice) : null;
    addVehicle({
      tenantId: activeFleetId,
      label: label.trim() || "FĂRĂ-LABEL",
      type,
      brand: brand.trim() || "—",
      model: model.trim() || "—",
      year: Number.isFinite(parsedYear) ? parsedYear : null,
      vin: vin.trim() || null,
      color: color.trim() || null,
      fuel: type === "bike" ? "none" : fuel,
      purchaseDateIso: purchaseDate || null,
      purchasePriceRon: Number.isFinite(parsedPrice) && (parsedPrice as number) > 0 ? parsedPrice : null,
      itpExpiryIso: needsRegistration ? (itpExpiry || null) : null,
      insuranceExpiryIso: needsRegistration ? (insExpiry || null) : null,
      notes: notes.trim() || null,
      createdBy: user.name,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Adaugă vehicul" description="Adaugă un vehicul nou în inventarul flotei." size="lg">
      <div className="grid grid-cols-2 gap-3">
        <F label="Label / Plăcuță">
          <input value={label} onChange={(e) => setLabel(e.target.value.toUpperCase())} placeholder="B 123 XYZ sau SCT-001" className={cn(inp, "font-mono uppercase")} />
        </F>
        <F label="Tip vehicul">
          <select value={type} onChange={(e) => setType(e.target.value as FleetVehicleType)} className={inp}>
            {(Object.keys(FLEET_VEHICLE_TYPE_LABEL) as FleetVehicleType[]).map((t) => (
              <option key={t} value={t} className="bg-card">{FLEET_VEHICLE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </F>
        <F label="Marcă">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Dacia, Yamaha, Pegas..." className={inp} />
        </F>
        <F label="Model">
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Logan, NMAX..." className={inp} />
        </F>
        <F label="An fabricație">
          <input type="number" min={1980} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" className={inp} />
        </F>
        <F label="VIN / Serie">
          <input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="17 caractere" className={cn(inp, "font-mono")} />
        </F>
        <F label="Culoare">
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Alb, Negru..." className={inp} />
        </F>
        <F label="Combustibil">
          <select value={fuel} onChange={(e) => setFuel(e.target.value as FleetVehicleFuel)} disabled={type === "bike"} className={cn(inp, type === "bike" && "opacity-50")}>
            {(Object.keys(FUEL_LABEL) as FleetVehicleFuel[]).map((f) => (
              <option key={f} value={f} className="bg-card">{FUEL_LABEL[f]}</option>
            ))}
          </select>
        </F>

        <F label="Data achiziției">
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
        </F>
        <F label="Preț achiziție (RON)">
          <input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" className={inp} />
        </F>

        {needsRegistration && (
          <>
            <F label="ITP — expirare">
              <input type="date" value={itpExpiry} onChange={(e) => setItpExpiry(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
            </F>
            <F label="RCA — expirare">
              <input type="date" value={insExpiry} onChange={(e) => setInsExpiry(e.target.value)} className={cn(inp, "[color-scheme:dark]")} />
            </F>
          </>
        )}
      </div>
      <div className="mt-3">
        <F label="Note">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Detalii utile..." className={cn(inp, "resize-none")} />
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
