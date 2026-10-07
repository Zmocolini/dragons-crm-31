"use client";

import { AlertTriangle, Car, Check, ChevronDown, ChevronUp, Globe, KeyRound, Phone, Ticket, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { useCouriers } from "@/lib/couriers/context";
import { useFleetTasks } from "@/lib/tasks/context";
import { useAllSubcontractorsRequestsSummary } from "@/lib/subcontractors/use-subcontractor-requests";
import { cn } from "@/lib/utils/cn";

type SubcontractorRow = { id: string; email: string; name: string; role: string; active: boolean };

export function FleetSwitcherDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { scope, setScope } = useOwnerScope();
  const { updateCourier } = useCouriers();
  const { updateTask } = useFleetTasks();
  const toast = useToast();

  const [subs, setSubs] = useState<SubcontractorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const { map: requestsMap, totalAll } = useAllSubcontractorsRequestsSummary(subs);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((j) => {
        setSubs((j.users ?? []).filter((u: SubcontractorRow) => u.role === "subcontractor_owner" && u.active));
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const chooseAll = () => {
    setScope(null);
    toast.success("Flotă", "Vezi toate flotele (Global Owner view)");
    onClose();
  };

  const chooseSub = (s: SubcontractorRow) => {
    setScope({ userId: s.id, email: s.email, name: s.name });
    toast.success("Flotă", `Ai schimbat pe flota lui ${s.name}`);
    onClose();
  };

  const isAllActive = !scope;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-fg">Schimbă flota</h2>
            <p className="mt-0.5 text-[11.5px] text-fg-muted">
              Alege un subcontractor pentru a-i vedea datele și cererile. „Toate” pentru vederea Global Owner.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-fg-muted hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Opțiunea „Toate flotele” (Global Owner default) */}
          <button
            type="button"
            onClick={chooseAll}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
              isAllActive
                ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                : "border-line bg-card-hover hover:bg-white/[0.06]",
            )}
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <Globe size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-fg">Toate flotele</span>
                {totalAll > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {totalAll} {totalAll === 1 ? "cerere deschisă" : "cereri deschise"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-fg-dim">Vezi datele TUTUROR subcontractorilor la un loc</div>
            </div>
            {isAllActive && <Check size={16} className="text-amber-300 shrink-0" />}
          </button>

          <div className="pt-1">
            <div className="mb-2 flex items-center justify-between px-1 text-[10.5px] font-bold uppercase tracking-wider text-fg-dim">
              <span>Subcontractori {subs.length > 0 && `(${subs.length})`}</span>
              {totalAll > 0 && (
                <span className="text-amber-400/90 font-semibold normal-case">
                  {totalAll} cereri necesită atenție
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-[12px] text-fg-muted">Se încarcă subcontractorii...</div>
            ) : subs.length === 0 ? (
              <div className="rounded-xl border border-line bg-card-hover p-4 text-center text-[12px] text-fg-muted">
                Niciun subcontractor încă. Creează unul din <b>Utilizatori</b>.
              </div>
            ) : (
              <div className="space-y-2.5">
                {subs.map((s) => {
                  const isActive = scope?.userId === s.id;
                  const reqs = requestsMap.get(s.id) ?? {
                    totalCount: 0,
                    activationsCount: 0,
                    phoneChangesCount: 0,
                    vehicleChangesCount: 0,
                    transfersCount: 0,
                    ticketsCount: 0,
                    pendingCouriers: [],
                    openTasks: [],
                    pills: [],
                  };
                  const isExpanded = expandedSubId === s.id;
                  const hasRequests = reqs.totalCount > 0;

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isActive
                          ? "border-violet-500/60 bg-violet-500/[0.08]"
                          : hasRequests
                          ? "border-amber-500/40 bg-card-hover"
                          : "border-line bg-card-hover hover:border-line-strong",
                      )}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => chooseSub(s)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm mt-0.5">
                            <User size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="truncate text-[13.5px] font-bold text-fg">{s.name}</span>
                              {hasRequests && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  {reqs.totalCount} {reqs.totalCount === 1 ? "cerere" : "cereri"}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-fg-dim">{s.email}</div>

                            {/* Indicator pills per categorie de cereri */}
                            {hasRequests && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {reqs.activationsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                    <KeyRound size={11} /> {reqs.activationsCount} de activat
                                  </span>
                                )}
                                {reqs.phoneChangesCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                                    <Phone size={11} /> {reqs.phoneChangesCount} schimbare număr
                                  </span>
                                )}
                                {reqs.vehicleChangesCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                                    <Car size={11} /> {reqs.vehicleChangesCount} schimbare vehicul
                                  </span>
                                )}
                                {reqs.ticketsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                                    <Ticket size={11} /> {reqs.ticketsCount} problemă
                                  </span>
                                )}
                              </div>
                            )}

                            {!hasRequests && (
                              <div className="mt-1 text-[11px] text-emerald-400/80 font-medium">
                                ✓ Fără cereri în așteptare
                              </div>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {hasRequests && (
                            <button
                              type="button"
                              onClick={() => setExpandedSubId(isExpanded ? null : s.id)}
                              title={isExpanded ? "Ascunde cererile" : "Vezi detaliile cererilor"}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-2 px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-white/[0.08] hover:text-fg transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  Închide <ChevronUp size={13} />
                                </>
                              ) : (
                                <>
                                  Vezi cereri <ChevronDown size={13} />
                                </>
                              )}
                            </button>
                          )}
                          {isActive && <Check size={18} className="text-violet-300 ml-1" />}
                        </div>
                      </div>

                      {/* Secțiune expandabilă cu cererile exacte ale lui Anton / subcontractorului */}
                      {isExpanded && hasRequests && (
                        <div className="border-t border-line/60 bg-black/20 p-3 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-fg-dim">
                            Cereri în curs de la {s.name}:
                          </div>

                          {/* Curieri în așteptare de activare */}
                          {reqs.pendingCouriers.map((courier) => (
                            <div
                              key={courier.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-[12px]"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                                  <KeyRound size={13} className="text-amber-400 shrink-0" />
                                  <span className="truncate">Activare curier: {courier.fullName}</span>
                                </div>
                                <div className="text-[11px] text-fg-dim">
                                  {courier.phone} · {courier.city} · {courier.platforms.join(", ") || "Fără platformă"}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateCourier(courier.id, { status: "active" });
                                    toast.success("Curier activat!", courier.fullName);
                                  }}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 transition-colors"
                                >
                                  <Check size={12} /> Activează
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateCourier(courier.id, { status: "rejected" });
                                    toast.error("Curier respins", courier.fullName);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-rose-500/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/35 transition-colors"
                                >
                                  <X size={12} /> Respinge
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Task-uri deschise (schimbare număr, vehicul, tichete) */}
                          {reqs.openTasks.map((task) => {
                            const isPhone =
                              task.kind === "phone_change" ||
                              task.title.toLowerCase().includes("numar") ||
                              task.details.toLowerCase().includes("telefon");
                            const isVehicle =
                              task.kind === "vehicle_change" ||
                              task.title.toLowerCase().includes("vehicul") ||
                              task.details.toLowerCase().includes("scuter");

                            return (
                              <div
                                key={task.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2 text-[12px]"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-semibold text-fg">
                                    {isPhone ? (
                                      <Phone size={13} className="text-sky-400 shrink-0" />
                                    ) : isVehicle ? (
                                      <Car size={13} className="text-purple-400 shrink-0" />
                                    ) : (
                                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                                    )}
                                    <span className="truncate">{task.title}</span>
                                  </div>
                                  {task.details && (
                                    <div className="text-[11px] text-fg-dim truncate max-w-sm">
                                      {task.details}
                                    </div>
                                  )}
                                  {task.courierName && (
                                    <div className="text-[10.5px] text-fg-muted font-medium">
                                      Curier vizat: {task.courierName}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateTask(task.id, { status: "resolved" });
                                    toast.success("Cerere marcată ca rezolvată", task.title);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors shrink-0"
                                >
                                  <Check size={12} /> Rezolvă
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
