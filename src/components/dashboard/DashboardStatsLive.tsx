"use client";

import { useMemo } from "react";
import { AlertTriangle, FileCheck, UserPlus, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "./StatCard";
import type { Stat, StatKey } from "@/lib/dashboard/types";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import { PAID_STATUSES } from "@/lib/payments/types";
import { buildTickets, computeTicketKpi } from "@/lib/issues/data";
import { formatRon } from "@/lib/reports/analytics";

const STAT_ICON: Record<StatKey, LucideIcon> = {
  active_couriers: Users,
  new_candidates: UserPlus,
  processed_payments: Wallet,
  completed_activations: FileCheck,
  open_issues: AlertTriangle,
};

const STAT_HREF: Record<StatKey, string> = {
  active_couriers: "/curieri",
  new_candidates: "/recrutare",
  processed_payments: "/plati",
  completed_activations: "/activari",
  open_issues: "/probleme",
};

export function DashboardStatsLive() {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();

  const stats = useMemo<Stat[]>(() => {
    const fleetCouriers = allRows.filter((c) => c.tenantId === activeFleetId);
    const active = fleetCouriers.filter((c) => c.status === "active").length;
    const roster = fleetCouriers.length;

    const paid = fleetPayments.filter((p) => PAID_STATUSES.includes(p.status)).reduce((s, p) => s + p.amountPaid, 0);

    const tickets = buildTickets(fleetCouriers);
    const openIssues = computeTicketKpi(tickets).total - tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

    return [
      { key: "active_couriers", label: "Curieri activi", value: String(active), subtext: `din ${roster} în flotă`, tone: "success", trend: roster > 0 ? { direction: "up", value: `${Math.round((active / roster) * 100)}%` } : undefined },
      { key: "processed_payments", label: "Plăți procesate", value: formatRon(paid), subtext: "achitate", tone: "warn" },
      { key: "open_issues", label: "Probleme deschise", value: String(openIssues), subtext: "necesită atenție", tone: "danger" },
    ];
  }, [allRows, activeFleetId, fleetPayments]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.key} stat={stat} icon={STAT_ICON[stat.key]} href={STAT_HREF[stat.key]} />
      ))}
    </div>
  );
}
