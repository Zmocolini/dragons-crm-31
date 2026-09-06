"use client";

import { Building2, Check, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSession, type FleetTenant, type PlanTier } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

const PLAN_TONE: Record<PlanTier, string> = {
  trial:        "border-white/10 bg-white/[0.05] text-fg-dim",
  start:        "border-sky-500/30 bg-sky-500/10 text-sky-300",
  business:     "border-violet-500/30 bg-violet-500/10 text-violet-200",
  professional: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  enterprise:   "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function FleetSwitcherDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { fleets, activeFleetId, setActiveFleet, user } = useSession();
  const { logActivity } = useProfile();
  const toast = useToast();

  const [selected, setSelected] = useState(activeFleetId);
  const [query, setQuery]       = useState("");

  useEffect(() => { if (open) { setSelected(activeFleetId); setQuery(""); } }, [open, activeFleetId]);

  // ESC + body scroll lock
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fleets;
    return fleets.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.city.toLowerCase().includes(q) ||
      f.cui.toLowerCase().includes(q)
    );
  }, [fleets, query]);

  if (!open) return null;

  function apply() {
    if (selected === activeFleetId) {
      onClose();
      return;
    }
    const target = fleets.find((f) => f.id === selected);
    if (!target) return;
    setActiveFleet(selected);
    // TODO(real-users): server action switchTenant(id) + revalidate session + hard refetch dashboard/curieri/plati.
    logActivity("tenant.switch", `${user.activeTenant.name} → ${target.name}`, "Flotă");
    toast.success("Flotă activă schimbată.", `Vezi acum: ${target.name}`);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fleet-switcher-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line/60 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white">
                <Building2 size={16} />
              </span>
              <div>
                <h2 id="fleet-switcher-title" className="text-[17px] font-bold text-fg">
                  Schimbă flota
                </h2>
                <p className="mt-0.5 text-[12px] text-fg-muted">
                  Selectează flota pe care vrei să o gestionezi.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-line/60 px-6 py-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută flotă după nume, oraș, CUI..."
              className="h-10 w-full rounded-lg border border-line bg-card-2 pl-9 pr-3 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              aria-label="Caută flotă"
            />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-line/60 bg-card-2/40 p-8 text-center text-[13px] text-fg-muted">
              Nicio flotă potrivită cu &bdquo;{query}&rdquo;.
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((f) => (
                <FleetRow
                  key={f.id}
                  fleet={f}
                  selected={selected === f.id}
                  isCurrent={activeFleetId === f.id}
                  onSelect={() => setSelected(f.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Info + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-card-2/40 px-6 py-4">
          <p className="max-w-md text-[11.5px] text-fg-muted">
            Flota selectată va fi setată ca flotă activă pentru această sesiune. Poți reveni oricând
            și schimba.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={selected === activeFleetId}
              className={cn(
                "rounded-lg px-5 py-2 text-[12.5px] font-semibold text-white transition-colors",
                selected === activeFleetId
                  ? "cursor-not-allowed bg-white/[0.06] text-fg-dim"
                  : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500",
              )}
            >
              Setează flotă activă
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetRow({
  fleet, selected, isCurrent, onSelect,
}: {
  fleet: FleetTenant;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const pct = Math.min(100, Math.round((fleet.planUsage.used / fleet.planUsage.total) * 100));

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-colors",
          selected
            ? "border-violet-500/60 bg-violet-500/[0.08] ring-1 ring-violet-500/40"
            : "border-line/70 bg-card-2/50 hover:border-line hover:bg-card-hover",
        )}
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-[15px] font-black text-white">
          {fleet.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[14px] font-semibold text-fg">{fleet.name}</div>
            {isCurrent && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Flota activă
              </span>
            )}
            <span className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              PLAN_TONE[fleet.planTier],
            )}>
              {fleet.planLabel}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} className="text-fg-dim" />
              {fleet.city}, {fleet.country}
            </span>
            <span className="text-fg-dim">·</span>
            <span className="font-mono text-fg-muted">CUI: {fleet.cui}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="min-w-[110px] text-[11.5px] text-fg-muted">
              <span className="font-mono font-semibold text-fg">{fleet.planUsage.used}</span>
              <span className="text-fg-dim"> / {fleet.planUsage.total}</span>{" "}
              curieri
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-8 text-right font-mono text-[10.5px] text-fg-dim">{pct}%</div>
          </div>
        </div>

        {/* Radio */}
        <span
          aria-hidden
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-violet-400 bg-violet-500/20"
              : "border-line bg-card-2",
          )}
        >
          {selected && <Check size={11} strokeWidth={3} className="text-violet-200" />}
        </span>
      </button>
    </li>
  );
}
