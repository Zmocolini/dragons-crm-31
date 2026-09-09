"use client";

import { Banknote, CheckCircle2, Clock, Users, XCircle } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

export type PaymentsKpi = {
  totalDue: number;
  courierCount: number;
  activeCourierCount: number;
  paid: number;
  inProgress: number;
  unpaid: number;
};

/** Progress ring SVG (procent 0-100). */
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;
  return (
    <svg width={46} height={46} viewBox="0 0 46 46" className="shrink-0 -rotate-90">
      <circle cx="23" cy="23" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
      <circle
        cx="23" cy="23" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
      />
      <text
        x="23" y="23" dy="0.35em" textAnchor="middle"
        className="rotate-90 fill-fg text-[11px] font-bold tabular-nums"
        style={{ transformOrigin: "center" }}
      >
        {clamped}%
      </text>
    </svg>
  );
}

export function PaymentsKpiCards({ kpi, currency }: { kpi: PaymentsKpi; currency: Currency }) {
  const pct = (n: number) => (kpi.totalDue > 0 ? Math.round((n / kpi.totalDue) * 100) : 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {/* Total de plată */}
      <div className="flex flex-col justify-between rounded-xl border border-line/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15">
            <Banknote size={17} className="text-violet-300" />
          </span>
          <span className="text-[10.5px] font-semibold text-emerald-300 tabular-nums">+12%</span>
        </div>
        <div className="mt-3">
          <div className="text-[20px] font-bold text-fg tabular-nums">{formatMoney(kpi.totalDue, currency)}</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-fg-dim">Total de plată</div>
          <div className="mt-1 text-[11px] text-fg-muted">pentru {kpi.courierCount} curieri</div>
        </div>
      </div>

      <RingCard
        icon={CheckCircle2} iconBg="bg-emerald-500/15" iconColor="text-emerald-300"
        ringColor="#34d399" label="Plăți efectuate"
        value={formatMoney(kpi.paid, currency)} pct={pct(kpi.paid)}
      />
      <RingCard
        icon={Clock} iconBg="bg-amber-500/15" iconColor="text-amber-300"
        ringColor="#fbbf24" label="În proces"
        value={formatMoney(kpi.inProgress, currency)} pct={pct(kpi.inProgress)}
      />
      <RingCard
        icon={XCircle} iconBg="bg-rose-500/15" iconColor="text-rose-300"
        ringColor="#fb7185" label="Neplătite"
        value={formatMoney(kpi.unpaid, currency)} pct={pct(kpi.unpaid)}
      />

      {/* Total curieri */}
      <div className="flex flex-col justify-between rounded-xl border border-line/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
            <Users size={17} className="text-blue-300" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-[20px] font-bold text-fg tabular-nums">{kpi.courierCount}</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-fg-dim">Total curieri</div>
          <div className="mt-1 text-[11px] text-fg-muted">din {kpi.activeCourierCount} activi</div>
        </div>
      </div>
    </div>
  );
}

function RingCard({
  icon: Icon, iconBg, iconColor, ringColor, label, value, pct,
}: {
  icon: typeof CheckCircle2;
  iconBg: string; iconColor: string; ringColor: string;
  label: string; value: string; pct: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line/60 bg-card p-4">
      <div className="min-w-0">
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", iconBg)}>
          <Icon size={17} className={iconColor} />
        </span>
        <div className="mt-3 truncate text-[17px] font-bold text-fg tabular-nums">{value}</div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-fg-dim">{label}</div>
      </div>
      <Ring pct={pct} color={ringColor} />
    </div>
  );
}
