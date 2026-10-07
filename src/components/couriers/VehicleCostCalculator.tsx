"use client";

import { Calculator } from "lucide-react";
import { useState } from "react";
import type { VehicleOwnership, VehicleType } from "@/lib/couriers/types";
import { MOTOR_TYPES, weeklyNet, weeklyVehicleCost, type VehicleCost } from "@/lib/couriers/vehicle-cost";

type Inputs = Omit<VehicleCost, "weeklyRon">;
const ron = (v: number) => `${v.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} RON`;

/** Mic calculator de evidență: costul vehiculului pe săptămână + ce rămâne curierului. */
export function VehicleCostCalculator({
  ownership, type, value, onChange, commissionPct, contractFeeRon,
}: {
  ownership: VehicleOwnership;
  type: VehicleType;
  value: Inputs;
  onChange: (v: Inputs) => void;
  commissionPct: number;
  contractFeeRon: number;
}) {
  const [gross, setGross] = useState("");
  const cost = weeklyVehicleCost(ownership, type, value);
  const { commission, net } = weeklyNet(Number(gross), commissionPct, contractFeeRon, cost);
  const motor = MOTOR_TYPES.includes(type);

  const num = (key: keyof Inputs, label: string, unit: string, step = 1) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim">{label}</span>
      <div className="relative">
        <input
          type="number" inputMode="decimal" min={0} step={step}
          value={value[key] ?? ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="dd-input pr-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-fg-dim">{unit}</span>
      </div>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11.5px] text-fg-muted">
        <Calculator size={13} className="text-violet-300" />
        {ownership === "rented"
          ? "Vehicul închiriat — chiria se ține în evidență săptămânal."
          : motor ? "Vehicul propriu — estimăm combustibilul pe săptămână." : "Bicicletă proprie — fără cost de combustibil."}
      </div>

      {ownership === "rented" && <div className="grid gap-3 sm:grid-cols-2">{num("rentWeeklyRon", "Chirie / săptămână", "RON", 10)}</div>}
      {ownership === "own" && motor && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {num("kmPerDay", "Km / zi", "km", 5)}
          {num("daysPerWeek", "Zile / săpt.", "zile")}
          {num("consumptionL100", "Consum", "L/100", 0.1)}
          {num("fuelPriceRon", "Preț carburant", "RON/L", 0.01)}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-line bg-card p-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim">Încasări brute estimate / săpt.</span>
          <div className="relative">
            <input
              type="number" inputMode="decimal" min={0} step={50}
              value={gross} onChange={(e) => setGross(e.target.value)}
              placeholder="ex. 2000" className="dd-input pr-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-fg-dim">RON</span>
          </div>
        </label>
        <dl className="grid min-w-[200px] grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 self-end text-[11.5px]">
          <dt className="text-fg-dim">Cost vehicul</dt><dd className="text-right tabular-nums text-fg">{cost ? "−" : ""}{ron(cost)}</dd>
          {gross !== "" && (
            <>
              <dt className="text-fg-dim">Comision {commissionPct}%</dt><dd className="text-right tabular-nums text-fg">−{ron(commission)}</dd>
              <dt className="text-fg-dim">Taxă contract</dt><dd className="text-right tabular-nums text-fg">{contractFeeRon ? "−" : ""}{ron(contractFeeRon)}</dd>
              <dt className="font-semibold text-fg">Rămâne curierului</dt>
              <dd className={`text-right font-bold tabular-nums ${net < 0 ? "text-rose-300" : "text-emerald-300"}`}>{ron(net)}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
