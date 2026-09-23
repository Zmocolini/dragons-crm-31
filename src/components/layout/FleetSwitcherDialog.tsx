"use client";

import { Check, Globe, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import { useOwnerScope } from "@/lib/owner-scope/context";
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
  const toast = useToast();

  const [subs, setSubs] = useState<SubcontractorRow[]>([]);
  const [loading, setLoading] = useState(false);

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
        className="w-full max-w-[500px] max-h-[85vh] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-fg">Schimbă flota</h2>
            <p className="mt-0.5 text-[11.5px] text-fg-muted">
              Alege un subcontractor pentru a-i vedea datele. „Toate" pentru vederea Global Owner.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded text-fg-muted hover:bg-white/[0.05] hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {/* Opțiunea „Toate flotele" (Global Owner default) */}
          <button
            type="button"
            onClick={chooseAll}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              isAllActive
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-line bg-card-hover hover:bg-white/[0.06]",
            )}
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Globe size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-fg">Toate flotele</div>
              <div className="text-[11px] text-fg-dim">Vezi datele TUTUROR subcontractorilor</div>
            </div>
            {isAllActive && <Check size={16} className="text-amber-300" />}
          </button>

          <div className="mb-2 mt-3 px-2 text-[10px] font-bold uppercase tracking-widest text-fg-dim">
            Subcontractori {subs.length > 0 && `(${subs.length})`}
          </div>

          {loading ? (
            <div className="py-4 text-center text-[12px] text-fg-muted">Se încarcă...</div>
          ) : subs.length === 0 ? (
            <div className="rounded-lg border border-line bg-card-hover p-3 text-center text-[12px] text-fg-muted">
              Niciun subcontractor încă. Creează unul din <b>Utilizatori</b>.
            </div>
          ) : (
            <div className="space-y-1">
              {subs.map((s) => {
                const isActive = scope?.userId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => chooseSub(s)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      isActive
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-line bg-card-hover hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                      <User size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-fg">{s.name}</div>
                      <div className="truncate text-[11px] text-fg-dim">{s.email}</div>
                    </div>
                    {isActive && <Check size={16} className="text-violet-300" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
