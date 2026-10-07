"use client";

import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useFleetTasks } from "@/lib/tasks/context";
import { FleetSwitcherDialog } from "./FleetSwitcherDialog";

export function TenantSwitcher() {
  const { user, can } = useSession();
  const { allRows } = useCouriers();
  const { allTasks } = useFleetTasks();
  const [open, setOpen] = useState(false);
  const t = user.activeTenant;
  const canSwitch = can("tenant.switch");

  const pendingCount = useMemo(() => {
    const pendingCouriers = allRows.filter((c) => c.status === "pending").length;
    const openTasks = allTasks.filter((t) => t.status !== "resolved").length;
    return pendingCouriers + openTasks;
  }, [allRows, allTasks]);

  const hasPending = pendingCount > 0;

  return (
    <>
      <button
        type="button"
        disabled={!canSwitch}
        onClick={() => canSwitch && setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card-hover disabled:cursor-default disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
      >
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-[13px] font-black text-white">
          {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          {hasPending && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-card" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-fg-dim">
            Flotă activă
          </span>
          <span className="block truncate text-[13px] font-semibold text-fg">
            {t.name}
          </span>
          {canSwitch && (
            <span className="block text-[10px] text-fg-dim">
              {hasPending ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {pendingCount} {pendingCount === 1 ? "cerere nouă" : "cereri noi"}
                </span>
              ) : (
                "Schimbă flotă"
              )}
            </span>
          )}
        </span>
        {canSwitch && (
          <ChevronsUpDown
            size={14}
            className="shrink-0 text-fg-dim group-hover:text-fg-muted"
          />
        )}
      </button>

      <FleetSwitcherDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
