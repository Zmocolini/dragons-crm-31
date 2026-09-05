import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconBox } from "@/components/ui/IconBox";
import { cn } from "@/lib/utils/cn";
import type { Stat } from "@/lib/dashboard/types";

const TREND_STYLE = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-fg-muted",
} as const;

const TREND_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const;

export function StatCard({ stat, icon }: { stat: Stat; icon: LucideIcon }) {
  const Trend = stat.trend ? TREND_ICON[stat.trend.direction] : null;

  return (
    <div className="group rounded-xl border border-line bg-card p-4 transition-colors hover:bg-card-hover">
      <div className="flex items-start justify-between gap-3">
        <IconBox icon={icon} tone={stat.tone} size={40} />
      </div>
      <div className="mt-3 text-[12.5px] font-medium text-fg-muted">
        {stat.label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-[22px] font-bold leading-none tracking-tight text-fg">
          {stat.value}
        </div>
        {stat.trend && Trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11.5px] font-semibold",
              TREND_STYLE[stat.trend.direction],
            )}
          >
            <Trend size={11} strokeWidth={2.5} />
            {stat.trend.value}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[11.5px] text-fg-dim">{stat.subtext}</div>
    </div>
  );
}
