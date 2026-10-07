"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, KeyRound, Phone, Car, X } from "lucide-react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useFleetTasks } from "@/lib/tasks/context";
import { useAllSubcontractorsRequestsSummary } from "@/lib/subcontractors/use-subcontractor-requests";
import { FleetSwitcherDialog } from "@/components/layout/FleetSwitcherDialog";

type SubUser = { id: string; email: string; name: string; role: string; active: boolean };

export function SubcontractorAlertBanner() {
  const { user } = useSession();
  const isGlobalOwner = user.role === "global_owner";
  const [subs, setSubs] = useState<SubUser[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isGlobalOwner) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((j) => {
        setSubs((j.users ?? []).filter((u: SubUser) => u.role === "subcontractor_owner" && u.active));
      })
      .catch(() => {});
  }, [isGlobalOwner]);

  const { map: requestsMap, totalAll } = useAllSubcontractorsRequestsSummary(subs);

  if (!isGlobalOwner || totalAll === 0 || dismissed) {
    return null;
  }

  // Identifică subcontractorii cu cereri
  const subsWithRequests = subs.filter((s) => (requestsMap.get(s.id)?.totalCount ?? 0) > 0);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.12] via-orange-500/[0.08] to-transparent p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 shadow-sm mt-0.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-bold text-amber-100">
                  {totalAll} {totalAll === 1 ? "cerere în așteptare" : "cereri în așteptare"} de la subcontractori
                </span>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  Necesită acțiune
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                {subsWithRequests.map((s) => {
                  const reqs = requestsMap.get(s.id);
                  if (!reqs) return null;
                  return (
                    <span key={s.id} className="inline-flex items-center gap-1.5 font-medium text-fg">
                      <b className="text-amber-200">{s.name}:</b>
                      {reqs.activationsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-300 text-[11.5px]">
                          <KeyRound size={11} /> {reqs.activationsCount} de activat
                        </span>
                      )}
                      {reqs.phoneChangesCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-sky-300 text-[11.5px]">
                          <Phone size={11} /> {reqs.phoneChangesCount} schimbare număr
                        </span>
                      )}
                      {reqs.vehicleChangesCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-purple-300 text-[11.5px]">
                          <Car size={11} /> {reqs.vehicleChangesCount} schimbare vehicul
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow hover:from-amber-500 hover:to-orange-500 transition-colors"
            >
              Vezi cererile și aprobă <ArrowRight size={13} />
            </button>
            <a
              href="#urgente"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-white/[0.06] hover:text-fg transition-colors"
            >
              Urgențe flotă
            </a>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Închide alerta"
              title="Ascunde alerta temporar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <FleetSwitcherDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
