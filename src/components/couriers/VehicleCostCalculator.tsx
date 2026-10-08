"use client";

import { Zap } from "lucide-react";
import { rentProfit, type VehicleCost } from "@/lib/couriers/vehicle-cost";

type Inputs = Omit<VehicleCost, "weeklyRon">;

const r0 = (v: number) => Math.round(v * 100) / 100;

/** Micro-calculator futurist pentru chirie: cât plătește antreprenorul, cât dă curierului, ce rămâne. */
export function RentProfitPanel({ value, onChange }: { value: Inputs; onChange: (v: Inputs) => void }) {
  const paid = Math.max(0, value.rentCostRon ?? 0);
  const charged = Math.max(0, value.rentWeeklyRon ?? 0);
  const profit = rentProfit(charged, paid);
  const margin = charged > 0 ? r0((profit / charged) * 100) : 0;
  const monthly = r0((profit * 52) / 12);
  const loss = profit < 0;
  const costShare = charged > 0 ? Math.min(100, (paid / charged) * 100) : paid > 0 ? 100 : 0;
  const tone = loss ? "text-rose-300" : "text-emerald-300";
  const glow = loss ? "drop-shadow-[0_0_12px_rgba(251,113,133,0.55)]" : "drop-shadow-[0_0_12px_rgba(52,211,153,0.55)]";

  const field = (key: "rentCostRon" | "rentWeeklyRon", label: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">{label}</span>
      <div className="relative">
        <input
          type="number" inputMode="decimal" min={0} step={10}
          value={value[key] ?? ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-3 pr-11 text-[14px] font-semibold tabular-nums text-slate-50 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/70 focus:bg-white/[0.09] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">RON</span>
      </div>
    </label>
  );

  return (
    <div data-surface="dark" className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-slate-950 via-[#14112e] to-slate-900 p-3.5 text-slate-100 shadow-[0_0_28px_-8px_rgba(139,92,246,0.6)]">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/25 blur-3xl" />
      <div aria-hidden className={`pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full blur-3xl ${loss ? "bg-rose-500/20" : "bg-emerald-500/20"}`} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">
            <Zap size={12} className="text-violet-300" /> Micro-calculator chirie
          </span>
          <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-slate-400">
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${loss ? "bg-rose-400" : "bg-emerald-400"}`} /> live
          </span>
        </div>

        <div className="grid grid-cols-2 items-end gap-2.5">
          {field("rentCostRon", "Plătește antreprenorul / săpt.")}
          {field("rentWeeklyRon", "Dat curierului / săpt.")}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-3">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Micro-profit / săpt.</div>
          <div className={`mt-0.5 text-[30px] font-extrabold leading-none tabular-nums ${tone} ${glow}`}>
            {profit > 0 ? "+" : ""}{r0(profit).toLocaleString("ro-RO")} <span className="text-[13px] font-semibold opacity-80">RON</span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Cost ${Math.round(costShare)}% din suma dată curierului`}>
            <div className={`h-full rounded-full transition-all duration-500 ${loss ? "bg-gradient-to-r from-rose-500 to-rose-300" : "bg-gradient-to-r from-violet-500 to-emerald-300"}`} style={{ width: `${costShare}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] uppercase tracking-wider text-slate-500">
            <span>Cost {Math.round(costShare)}%</span><span>{loss ? "Pierdere" : `Profit ${Math.max(0, 100 - Math.round(costShare))}%`}</span>
          </div>

          <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 text-[11px]">
            <div><dt className="text-slate-500">Marjă</dt><dd className={`font-bold tabular-nums ${tone}`}>{margin.toLocaleString("ro-RO")}%</dd></div>
            <div className="text-right"><dt className="text-slate-500">Estimat / lună</dt><dd className={`font-bold tabular-nums ${tone}`}>{monthly > 0 ? "+" : ""}{monthly.toLocaleString("ro-RO")} RON</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
