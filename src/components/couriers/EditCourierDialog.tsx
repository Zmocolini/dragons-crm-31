"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { useAccountDirectory } from "@/lib/couriers/use-account-directory";
import { usePayments } from "@/lib/payments/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import { COLLABORATION_LABEL } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useSettings } from "@/lib/settings/context";
import { useSession } from "@/lib/rbac/session";
import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";

const PLATFORMS: PlatformKey[] = ["bolt", "wolt", "glovo"];
const PLATFORM_LABEL: Record<PlatformKey, string> = { bolt: "Bolt Food", wolt: "Wolt", glovo: "Glovo" };

export function EditCourierDialog({ row, onClose }: { row: CourierRow; onClose: () => void }) {
  const { updateCourier } = useCouriers();
  const { settings } = useSettings();
  const { user } = useSession();
  const isSubcontractor = user.role === "subcontractor_owner";
  const isGlobalOwner = user.role === "global_owner";
  const toast = useToast();
  const accounts = useAccountDirectory();
  const { reassignPaymentsOf } = usePayments();

  const [fullName, setFullName] = useState(row.fullName);
  const [phone, setPhone] = useState(row.phone);
  const [email, setEmail] = useState(row.email ?? "");
  const [city, setCity] = useState(row.city);
  const [platforms, setPlatforms] = useState<PlatformKey[]>(row.platforms);
  const [collaboration, setCollaboration] = useState<string>(COLLABORATION_LABEL[row.collaboration] ?? row.collaboration);
  const [commissionPct, setCommissionPct] = useState<number>(row.commissionPct ?? 10);
  const [weeklyContractFeeRon, setWeeklyContractFeeRon] = useState<number>(row.weeklyContractFeeRon ?? 210);
  const [iban, setIban] = useState<string>(row.iban ?? "");
  const [status, setStatus] = useState<CourierStatus>(row.status);
  const initialOwner = (row.createdBy ?? "").trim().toLowerCase();
  const [ownerEmail, setOwnerEmail] = useState(initialOwner);
  // „Aparține de": flota (contul tău) sau un subcontractor activ; proprietarul curent rămâne în listă oricum.
  const selfEmail = user.email.trim().toLowerCase();
  const ownerOptions = [
    { email: selfEmail, label: "Flota (intern)" },
    ...[...accounts.entries()]
      .filter(([, a]) => a.role === "subcontractor_owner" && a.active !== false)
      .map(([email, a]) => ({ email, label: a.name || email })),
  ];
  if (initialOwner.includes("@") && !ownerOptions.some((o) => o.email === initialOwner)) {
    ownerOptions.push({ email: initialOwner, label: accounts.get(initialOwner)?.name ?? initialOwner });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function save() {
    if (!fullName.trim()) { toast.error("Numele e obligatoriu"); return; }
    const transfer = isGlobalOwner && ownerEmail.includes("@") && ownerEmail !== initialOwner;
    updateCourier(row.id, {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      city,
      platforms,
      collaboration: collaboration.trim(),
      commissionPct,
      weeklyContractFeeRon,
      iban: iban.trim() || undefined,
      ...(isSubcontractor ? {} : { status }),
      ...(transfer ? { createdBy: ownerEmail } : {}),
    });
    if (transfer) {
      // Plățile curierului îl urmează; serverul mută și notele/patch-urile lor (sync/ownership.ts).
      reassignPaymentsOf(row.id, ownerEmail);
      toast.success("Curier mutat", `${fullName} → ${ownerOptions.find((o) => o.email === ownerEmail)?.label ?? ownerEmail}`);
    }
    toast.success("Curier actualizat", fullName);
    onClose();
  }

  function togglePlatform(p: PlatformKey) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-6 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-fg">Editează curier</h2>
            <p className="mt-0.5 text-[12px] text-fg-muted">{row.fullName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <F label="Nume complet">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="inp" />
          </F>
          <div className="grid gap-3 md:grid-cols-2">
            <F label="Telefon">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="inp" />
            </F>
            <F label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="inp" />
            </F>
          </div>
          <F label="Oraș">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="inp">
              <option value="">Selectează</option>
              {settings.cities.filter((c) => c.status === "active").map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </F>
          <F label="Platforme">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      on ? "border-violet-500/60 bg-violet-500/15 text-violet-100" : "border-line bg-card-2 text-fg-muted hover:bg-card-hover",
                    )}
                  >
                    {PLATFORM_LABEL[p]}
                  </button>
                );
              })}
            </div>
          </F>
          <F label="Tip colaborare">
            <input value={collaboration} onChange={(e) => setCollaboration(e.target.value)} placeholder="Ex.: Contract colaborare, PFA, CIM 8h" className="inp" />
          </F>
          <div className="grid gap-3 md:grid-cols-2">
            <F label="Comision flotă (%)">
              <div className="relative">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="inp pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-dim">%</span>
              </div>
            </F>
            <F label="Taxă contract săptămânală">
              <div className="relative">
                <input
                  type="number" min={0} step={10}
                  value={weeklyContractFeeRon}
                  onChange={(e) => setWeeklyContractFeeRon(Math.max(0, Number(e.target.value) || 0))}
                  className="inp pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-dim">RON</span>
              </div>
            </F>
          </div>
          <F label="IBAN">
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="RO49 AAAA 1B31 0075 9384 0000"
              className="inp font-mono tracking-wider"
            />
          </F>
          {isSubcontractor ? (
            <F label="Status curier">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-card-2/50 px-3 py-2 text-[12.5px]">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    row.status === "active"
                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : row.status === "pending"
                      ? "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                      : row.status === "rejected"
                      ? "border border-rose-500/30 bg-rose-500/15 text-rose-300"
                      : "border border-zinc-700/40 bg-white/[0.06] text-zinc-300",
                  )}
                >
                  {COURIER_STATUS_LABEL[row.status] || row.status}
                </span>
                <span className="text-[11px] text-fg-dim">Statusul este gestionat și confirmat exclusiv de flotă</span>
              </div>
            </F>
          ) : (
            <F label="Status curier (Flotă)">
              <select value={status} onChange={(e) => setStatus(e.target.value as CourierStatus)} className="inp">
                {(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[]).map((s) => (
                  <option key={s} value={s}>{COURIER_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </F>
          )}
          {isGlobalOwner && accounts.size > 0 && (
            <F label="Aparține de">
              <select value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="inp">
                {!initialOwner.includes("@") && <option value={initialOwner}>Nesetat ({initialOwner || "gol"})</option>}
                {ownerOptions.map((o) => (
                  <option key={o.email} value={o.email}>{o.label}</option>
                ))}
              </select>
              {ownerEmail !== initialOwner && ownerEmail.includes("@") && (
                <p className="mt-1 text-[11px] text-amber-300">
                  La salvare, curierul și plățile lui trec la noul proprietar; el îi vede, celălalt nu.
                </p>
              )}
            </F>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line/60 bg-card-2/40 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover">
            Anulează
          </button>
          <button type="button" onClick={save} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500">
            Salvează
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.inp) {
          height: 40px; width: 100%; border-radius: 8px;
          border: 1px solid var(--color-line); background: var(--color-card-2);
          padding: 0 12px; font-size: 13px; color: var(--color-fg);
        }
        :global(.inp:focus) {
          border-color: color-mix(in oklab, var(--color-accent) 60%, transparent); outline: none;
        }
      `}</style>
    </div>,
    document.body,
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</span>
      {children}
    </label>
  );
}
