"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Car, Check, KeyRound, Phone, Send, Ticket, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useFleetTasks } from "@/lib/tasks/context";
import { useSession } from "@/lib/rbac/session";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { FleetTaskKind, FleetTaskPriority } from "@/lib/tasks/types";
import { cn } from "@/lib/utils/cn";

type RequestType = "phone_change" | "vehicle_change" | "activation" | "ticket";

export function RequestChangeDialog({
  courier,
  open,
  onClose,
}: {
  courier: CourierRow;
  open: boolean;
  onClose: () => void;
}) {
  const { addTask } = useFleetTasks();
  const { activeFleetId } = useSession();
  const toast = useToast();

  const [type, setType] = useState<RequestType>("phone_change");
  const [newPhone, setNewPhone] = useState("");
  const [newVehicle, setNewVehicle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<FleetTaskPriority>("high");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let title = "";
    let finalDetails = details.trim();
    let kind: FleetTaskKind = "other";

    if (type === "phone_change") {
      kind = "phone_change";
      if (!newPhone.trim()) {
        toast.error("Completează noul număr de telefon");
        setSubmitting(false);
        return;
      }
      title = `Schimbare număr: ${newPhone.trim()} pentru ${courier.fullName}`;
      finalDetails = `Număr vechi: ${courier.phone}\nNumăr nou solicitat: ${newPhone.trim()}${details.trim() ? `\nDetalii: ${details.trim()}` : ""}`;
    } else if (type === "vehicle_change") {
      kind = "vehicle_change";
      if (!newVehicle.trim()) {
        toast.error("Completează noul vehicul");
        setSubmitting(false);
        return;
      }
      title = `Schimbare vehicul: ${newVehicle.trim()} pentru ${courier.fullName}`;
      finalDetails = `Vehicul vechi: ${courier.vehicleType} (${courier.vehicleModel})\nVehicul nou: ${newVehicle.trim()}${details.trim() ? `\nDetalii: ${details.trim()}` : ""}`;
    } else if (type === "activation") {
      kind = "activation";
      title = `Cerere activare urgentă pentru ${courier.fullName}`;
      finalDetails = `Curier: ${courier.fullName} (${courier.city})\nPlatforme: ${courier.platforms.join(", ")}${details.trim() ? `\nDetalii: ${details.trim()}` : ""}`;
    } else {
      kind = "ticket";
      title = `Problemă / Solicitare pentru ${courier.fullName}`;
      if (!details.trim()) {
        toast.error("Te rugăm să descrii problema");
        setSubmitting(false);
        return;
      }
    }

    const ok = addTask({
      kind,
      title,
      details: finalDetails,
      priority,
      courierId: courier.id,
      courierName: courier.fullName,
      tenantId: activeFleetId,
    });

    if (ok) {
      toast.success("Cererea a fost trimisă către flotă!", title);
      onClose();
    } else {
      toast.error("Eroare la trimiterea cererii");
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-6 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-fg">Solicită modificare către flotă</h2>
            <p className="mt-0.5 text-[12px] text-fg-muted">{courier.fullName} · {courier.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim mb-2">
              Tip solicitare
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("phone_change")}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-[12px] font-semibold transition-colors",
                  type === "phone_change"
                    ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                    : "border-line bg-card-2 text-fg-muted hover:bg-white/[0.05]",
                )}
              >
                <Phone size={15} className="shrink-0 text-sky-400" />
                <span>Schimbare număr</span>
              </button>
              <button
                type="button"
                onClick={() => setType("vehicle_change")}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-[12px] font-semibold transition-colors",
                  type === "vehicle_change"
                    ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                    : "border-line bg-card-2 text-fg-muted hover:bg-white/[0.05]",
                )}
              >
                <Car size={15} className="shrink-0 text-purple-400" />
                <span>Schimbare vehicul</span>
              </button>
              <button
                type="button"
                onClick={() => setType("activation")}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-[12px] font-semibold transition-colors",
                  type === "activation"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                    : "border-line bg-card-2 text-fg-muted hover:bg-white/[0.05]",
                )}
              >
                <KeyRound size={15} className="shrink-0 text-emerald-400" />
                <span>Activare cont</span>
              </button>
              <button
                type="button"
                onClick={() => setType("ticket")}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-[12px] font-semibold transition-colors",
                  type === "ticket"
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                    : "border-line bg-card-2 text-fg-muted hover:bg-white/[0.05]",
                )}
              >
                <Ticket size={15} className="shrink-0 text-amber-400" />
                <span>Altă problemă</span>
              </button>
            </div>
          </div>

          {type === "phone_change" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim mb-1">
                Noul număr de telefon
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="07xxxxxxxx"
                autoFocus
                className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-sky-500"
              />
              <span className="mt-1 block text-[11px] text-fg-dim">
                Număr curent: <span className="font-mono">{courier.phone}</span>
              </span>
            </div>
          )}

          {type === "vehicle_change" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim mb-1">
                Noul vehicul (tip, model, nr. înmatriculare)
              </label>
              <input
                type="text"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                placeholder="ex. Autoturism · Dacia Logan · B 123 ABC"
                autoFocus
                className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-purple-500"
              />
              <span className="mt-1 block text-[11px] text-fg-dim">
                Vehicul curent: {courier.vehicleType} ({courier.vehicleModel})
              </span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim mb-1">
              Detalii suplimentare pentru flotă
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Scrie orice detalii relevante pentru administratorul flotei..."
              rows={3}
              className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim mb-1">
              Prioritate
            </label>
            <div className="flex gap-2">
              {(["normal", "high", "urgent"] as FleetTaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-[11.5px] font-semibold transition-colors capitalize",
                    priority === p
                      ? p === "urgent"
                        ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                        : p === "high"
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                        : "border-blue-500/50 bg-blue-500/20 text-blue-200"
                      : "border-line bg-card-2 text-fg-muted hover:bg-white/[0.05]",
                  )}
                >
                  {p === "normal" ? "Normală" : p === "high" ? "Ridicată" : "Urgentă"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500 disabled:opacity-50"
            >
              <Send size={13} />
              Trimite solicitarea
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
