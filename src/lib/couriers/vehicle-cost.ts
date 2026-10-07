// Calculator de evidență pentru vehiculul curierului: cât îl costă pe săptămână
// și cât îi rămâne după comision, taxa de contract și vehicul.
import type { VehicleOwnership, VehicleType } from "@/lib/couriers/types";

export type VehicleCost = {
  /** Doar la închiriat: cât dă curierul (se scade din plata lui). */
  rentWeeklyRon?: number;
  /** Doar la închiriat: cât plătește antreprenorul pentru vehicul. */
  rentCostRon?: number;
  /** Doar la închiriat: micro-profitul / săpt. = dat curierului − plătit de antreprenor. */
  profitWeeklyRon?: number;
  /** Doar la propriu cu motor (scuter/mașină). */
  kmPerDay?: number;
  daysPerWeek?: number;
  consumptionL100?: number;
  fuelPriceRon?: number;
  /** Rezultatul salvat pe curier, ca să rămână în evidență. */
  weeklyRon: number;
};

export const MOTOR_TYPES: ReadonlyArray<VehicleType> = ["scooter", "car"];

/** Valori de pornire — se modifică în calculator. */
export function costDefaults(type: VehicleType): Omit<VehicleCost, "weeklyRon"> {
  return type === "car"
    ? { kmPerDay: 80, daysPerWeek: 6, consumptionL100: 6.5, fuelPriceRon: 7.6 }
    : { kmPerDay: 60, daysPerWeek: 6, consumptionL100: 3, fuelPriceRon: 7.6 };
}

const n = (v: number | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function weeklyVehicleCost(ownership: VehicleOwnership, type: VehicleType, c: Omit<VehicleCost, "weeklyRon">): number {
  if (ownership === "rented") return r2(n(c.rentWeeklyRon));
  if (!MOTOR_TYPES.includes(type)) return 0;
  return r2((n(c.kmPerDay) * n(c.daysPerWeek) * n(c.consumptionL100) * n(c.fuelPriceRon)) / 100);
}

export function weeklyNet(gross: number, commissionPct: number, contractFeeRon: number, vehicleRon: number) {
  const commission = r2((n(gross) * n(commissionPct)) / 100);
  return { commission, net: r2(n(gross) - commission - n(contractFeeRon) - n(vehicleRon)) };
}

/** Micro-profit din chirie: ce ia de la curier minus ce plătește antreprenorul (poate fi negativ). */
export function rentProfit(chargedToCourier: number | undefined, paidByEntrepreneur: number | undefined): number {
  return r2(n(chargedToCourier) - n(paidByEntrepreneur));
}
