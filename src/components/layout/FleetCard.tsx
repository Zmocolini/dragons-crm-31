"use client";

import { ChevronsUpDown, Globe, User as UserIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useFleetTasks } from "@/lib/tasks/context";
import { FleetSwitcherDialog } from "./FleetSwitcherDialog";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { cn } from "@/lib/utils/cn";

type SubUser = { id: string; email: string; name: string; role: string; active: boolean };

/**
 * Card unic în sidebar-jos: flotă activă + plan + Schimbă flota.
 * Include badge în timp real dacă Anton sau alt subcontractor are cereri deschise!
 */
export function FleetCard() {
  const { user, activeFleetId, can } = useSession();
  const { allRows } = useCouriers();
  const { allTasks } = useFleetTasks();
  const { scope } = useOwnerScope();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<SubUser[]>([]);
  const t = user.activeTenant;
  const canSwitch = can("tenant.switch");

  useEffect(() => {
    if (!canSwitch) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((j) => {
        setSubs((j.users ?? []).filter((u: SubUser) => u.role === "subcontractor_owner" && u.active));
      })
      .catch(() => {});
  }, [canSwitch]);

  const activeInFleet = useMemo(
    () => allRows.filter((c) => c.tenantId === activeFleetId && c.status === "active").length,
    [allRows, activeFleetId],
  );

  // Calculează dacă există cereri deschise de la subcontractori (activări sau task-uri)
  const pendingRequestsInfo = useMemo(() => {
    const subEmails = new Set(subs.map((s) => s.email.toLowerCase()));
    const subNames = subs.map((s) => s.name);

    const pendingCouriers = allRows.filter((c) => {
      if (c.status !== "pending") return false;
      const creator = (c.createdBy ?? "").toLowerCase();
      const subName = (c.subcontractorName ?? "").toLowerCase();
      return (
        subEmails.has(creator) ||
        creator.includes("anton") ||
        subName.includes("anton") ||
        subNames.some((n) => n.toLowerCase() === subName)
      );
    });

    const openTasks = allTasks.filter((t) => {
      if (t.status === "resolved") return false;
      const creator = t.createdBy.toLowerCase();
      const raised = t.raisedBy.toLowerCase();
      return subEmails.has(creator) || creator.includes("anton") || raised.includes("anton");
    });

    const total = pendingCouriers.length + openTasks.length;
    let mainSubName = "";
    if (subs.some((s) => s.name.toLowerCase().includes("anton") || s.email.toLowerCase().includes("anton"))) {
      mainSubName = "Anton";
    } else if (subs.length > 0) {
      mainSubName = subs[0].name;
    }

    return { total, mainSubName };
  }, [subs, allRows, allTasks]);

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

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {/* Banner de alertă când există cereri în așteptare de la subcontractori */}
        {pendingRequestsInfo.total > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-between gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/25 text-left"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="truncate">
                {pendingRequestsInfo.mainSubName ? `${pendingRequestsInfo.mainSubName}: ` : ""}
                {pendingRequestsInfo.total} {pendingRequestsInfo.total === 1 ? "cerere în așteptare" : "cereri în așteptare"}
              </span>
            </span>
            <span className="text-[10px] text-amber-300 font-bold uppercase underline shrink-0">
              Vezi
            </span>
          </button>
        )}

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
                "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                scope
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                  : "bg-gradient-to-br from-amber-500 to-orange-500",
              )}
            >
              {scope ? <UserIcon size={16} /> : <Globe size={16} />}
              {pendingRequestsInfo.total > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-card" />
                </span>
              )}
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
      </div>

      <FleetSwitcherDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
