"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/rbac/session";
import { FleetSwitcherDialog } from "./FleetSwitcherDialog";
import { cn } from "@/lib/utils/cn";

/**
 * Card unic în sidebar-jos: flotă activă + plan + Schimbă flota.
 * Înlocuiește vechile TenantSwitcher + PlanUsage (care duplicau info).
 */
export function FleetCard() {
  const { user, can } = useSession();
  const [open, setOpen] = useState(false);
  const t = user.activeTenant;
  const canSwitch = can("tenant.switch");

  const pct = Math.min(100, Math.max(0, Math.round((t.planUsage.used / t.planUsage.total) * 100)));
  const initials = t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const barTone = pct >= 90 ? "from-rose-500 to-rose-400"
    : pct >= 70 ? "from-amber-500 to-amber-400"
    : "from-emerald-500 to-teal-500";

  return (
    <>
      <button
        type="button"
        disabled={!canSwitch}
        onClick={() => canSwitch && setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex w-full flex-col gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card-hover disabled:cursor-default disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-[13px] font-black text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-fg-dim">
              Flotă activă
            </span>
            <span className="block truncate text-[13px] font-semibold text-fg">{t.name}</span>
          </span>
          {canSwitch && (
            <ChevronsUpDown
              size={13}
              className="shrink-0 text-fg-dim group-hover:text-fg-muted"
            />
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10.5px]">
            <span className="text-fg-muted">
              <span className="font-mono font-semibold text-fg">{t.planUsage.used}</span>
              <span className="text-fg-dim"> / {t.planUsage.total}</span> curieri
            </span>
            <span className="font-mono font-bold text-fg">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r", barTone)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </button>

      <FleetSwitcherDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
