"use client";

import { ChevronsUpDown, Globe, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useMemo } from "react";
import { FleetSwitcherDialog } from "./FleetSwitcherDialog";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { cn } from "@/lib/utils/cn";

/**
 * Card unic în sidebar-jos: flotă activă + plan + Schimbă flota.
 * Înlocuiește vechile TenantSwitcher + PlanUsage (care duplicau info).
 */
export function FleetCard() {
  const { user, activeFleetId, can } = useSession();
  const { allRows } = useCouriers();
  const { scope } = useOwnerScope();
  const [open, setOpen] = useState(false);
  const t = user.activeTenant;
  const canSwitch = can("tenant.switch");

  const activeInFleet = useMemo(
    () => allRows.filter((c) => c.tenantId === activeFleetId && c.status === "active").length,
    [allRows, activeFleetId],
  );

  // REGULĂ HOOKS: early-return DOAR după toate hook-urile (React error #310).
  if (!canSwitch) return null;

  // Label-uri dinamice bazate pe scope
  const displayName = scope ? scope.name : "Toate flotele";
  const displaySub = scope ? scope.email : "Vezi datele TUTUROR subcontractorilor";
  const capacity = t.planUsage.total;
  const pct = capacity > 0 ? Math.min(100, Math.max(0, Math.round((activeInFleet / capacity) * 100))) : 0;
  const initials = t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const barTone = pct >= 90 ? "from-rose-500 to-rose-400"
    : pct >= 70 ? "from-amber-500 to-amber-400"
    : "from-emerald-500 to-teal-500";

  const brandColor = t.brandColor ?? "#f97316";
  const flagOrInitials = t.flagEmoji ?? initials;

  return (
    <>
      <button
        type="button"
        disabled={!canSwitch}
        onClick={() => canSwitch && setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex w-full flex-col gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card-hover disabled:cursor-default disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        style={{ borderColor: `${brandColor}30` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
              scope
                ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                : "bg-gradient-to-br from-amber-500 to-orange-500",
            )}
          >
            {scope ? <UserIcon size={16} /> : <Globe size={16} />}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-fg-dim">
              Flotă activă
            </span>
            <span className="block truncate text-[13px] font-semibold text-fg">{displayName}</span>
            <span className="block truncate text-[10px] text-fg-dim">{displaySub}</span>
          </span>
          <ChevronsUpDown size={13} className="shrink-0 text-fg-dim group-hover:text-fg-muted" />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10.5px]">
            <span className="text-fg-muted">
              <span className="font-mono font-semibold text-fg">{activeInFleet}</span>
              <span className="text-fg-dim"> / {capacity}</span> curieri activi
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
