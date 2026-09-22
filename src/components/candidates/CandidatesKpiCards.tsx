"use client";

import { CheckCircle2, MessageCircle, TrendingUp, UserCheck, Users, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type KpiCounts = {
  total: number;
  contacted: number;
  inDiscussion: number;
  interviewScheduled: number;
  accepted: number;
  rejected: number;
};

type CardMeta = {
  key: keyof KpiCounts;
  label: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  trend?: string;
};

export function CandidatesKpiCards({ counts }: { counts: KpiCounts }) {
  const pct = (n: number) => (counts.total > 0 ? Math.round((n / counts.total) * 100) : 0);

  const cards: CardMeta[] = [
    { key: "total",              label: "Total leaduri",     icon: Users,        color: "text-blue-300",    iconBg: "bg-blue-500/15",    trend: "+18%" },
    { key: "contacted",          label: "Contactați",        icon: MessageCircle,color: "text-sky-300",     iconBg: "bg-sky-500/15",     trend: `${pct(counts.contacted)}%` },
    { key: "inDiscussion",       label: "În discuție",       icon: TrendingUp,   color: "text-amber-300",   iconBg: "bg-amber-500/15",   trend: `${pct(counts.inDiscussion)}%` },
    { key: "interviewScheduled", label: "Programări interviu", icon: UserCheck,  color: "text-violet-300",  iconBg: "bg-violet-500/15",  trend: `${pct(counts.interviewScheduled)}%` },
    { key: "accepted",           label: "Acceptați",         icon: CheckCircle2, color: "text-emerald-300", iconBg: "bg-emerald-500/15", trend: `${pct(counts.accepted)}%` },
    { key: "rejected",           label: "Respinși",          icon: XCircle,      color: "text-rose-300",    iconBg: "bg-rose-500/15",    trend: `${pct(counts.rejected)}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.key} className="flex items-center gap-3 rounded-xl border border-line/60 bg-card p-3">
          <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", c.iconBg)}>
            <c.icon size={17} className={c.color} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-fg tabular-nums">{counts[c.key]}</span>
              {c.trend && (
                <span className={cn("text-[10.5px] font-semibold tabular-nums", c.color)}>
                  {c.trend}
                </span>
              )}
            </div>
            <div className="truncate text-[10.5px] font-medium uppercase tracking-wider text-fg-dim">
              {c.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
