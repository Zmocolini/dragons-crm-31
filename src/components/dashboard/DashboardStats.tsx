import { AlertTriangle, FileCheck, UserPlus, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "./StatCard";
import type { Stat, StatKey } from "@/lib/dashboard/types";

const STAT_ICON: Record<StatKey, LucideIcon> = {
  active_couriers: Users,
  new_candidates: UserPlus,
  processed_payments: Wallet,
  completed_activations: FileCheck,
  open_issues: AlertTriangle,
};

export function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.key} stat={stat} icon={STAT_ICON[stat.key]} />
      ))}
    </div>
  );
}
