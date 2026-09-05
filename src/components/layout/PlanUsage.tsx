"use client";

import { useSession } from "@/lib/rbac/session";

export function PlanUsage() {
  const { user } = useSession();
  const { planLabel, planUsage } = user.activeTenant;
  const pct = Math.min(
    100,
    Math.max(0, Math.round((planUsage.used / planUsage.total) * 100)),
  );

  return (
    <div className="px-1">
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-fg">{planLabel}</span>
        <span className="font-mono text-fg-muted">{pct}%</span>
      </div>
      <div className="mb-1 text-[10.5px] text-fg-dim">
        {planUsage.used.toLocaleString("ro-RO")} / {planUsage.total.toLocaleString("ro-RO")} curieri
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
