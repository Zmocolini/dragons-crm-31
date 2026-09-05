"use client";

import {
  BarChart3, CheckCircle2, Crown, Headphones, MessageSquare,
  ShieldCheck, Sparkles, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";

const FEATURES = [
  "Gestionare curieri nelimitată (până la 500)",
  "Recrutare și leaduri",
  "Interviuri și activări",
  "Plăți și rapoarte financiare",
  "Documente și alerte",
  "Vehicule și echipamente",
  "Cazări și locații",
  "Subcontractori și parteneri",
  "Rapoarte avansate și export Excel",
  "AI Copilot (asistență inteligentă)",
  "Calendar și task-uri",
  "Suport prioritar",
  "Actualizări permanente",
  "Securitate și backup",
];

const STATS: { icon: LucideIcon; iconTone: string; label: string; value: string; sub: string }[] = [
  { icon: Users,       iconTone: "text-violet-300",   label: "Limită curieri", value: "500",                sub: "Inclus în plan" },
  { icon: BarChart3,   iconTone: "text-blue-300",     label: "Toate modulele", value: "Funcționalități",     sub: "Incluse" },
  { icon: Headphones,  iconTone: "text-emerald-300",  label: "Suport prioritar", value: "Asistență",         sub: "Inclus" },
  { icon: ShieldCheck, iconTone: "text-amber-300",    label: "Actualizări gratuite", value: "Securitate",   sub: "Inclus" },
];

export function PlanDialog({
  open,
  onClose,
  used,
  total,
  label,
}: {
  open: boolean;
  onClose: () => void;
  used: number;
  total: number;
  label: string;
}) {
  const toast = useToast();
  const { logActivity } = useProfile();
  const pct = Math.min(100, Math.round((used / total) * 100));

  function contact() {
    // TODO(real-users): trigger billing/support flow real.
    logActivity("preferences.update", "Cerere upgrade plan", "Plan");
    toast.success("Cerere trimisă către echipa Dragon.", "Te contactăm în 24h pentru upgrade.");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Detalii plan" description="Informații complete despre planul tău actual." size="lg">
      <div className="space-y-5">
        <div className="rounded-xl border border-line/70 bg-card-2/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Crown size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[17px] font-bold text-fg">{label}</div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Activ
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-fg-muted">Soluția completă pentru flotă în creștere.</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[19px] font-bold text-fg">
                {used} <span className="text-fg-dim">/ {total}</span>
              </div>
              <div className="text-[11px] text-fg-dim">curieri utilizați</div>
            </div>
            <div className="text-[26px] font-bold text-blue-400">{pct}%</div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-line/70 bg-card-2/40 p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card ${s.iconTone}`}>
                    <Icon size={14} />
                  </span>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                    {s.label}
                  </div>
                </div>
                <div className="mt-3 text-[15px] font-bold text-fg">{s.value}</div>
                <div className="mt-0.5 text-[10.5px] text-emerald-400">{s.sub}</div>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-fg">
            <Sparkles size={15} className="text-violet-300" />
            Ce include {label}?
          </h3>
          <p className="mt-1 text-[12.5px] text-fg-muted">
            Ai acces la toate funcționalitățile platformei, fără limitări.
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[12.5px] text-fg">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-600/15 via-indigo-600/12 to-blue-600/15 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <MessageSquare size={16} />
            </span>
            <div className="leading-tight">
              <div className="text-[13.5px] font-semibold text-fg">Vrei să crești limita de curieri?</div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">
                Contactează echipa noastră pentru un upgrade personalizat.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={contact}
            className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
          >
            Contactează echipa
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          Închide
        </button>
      </div>
    </Dialog>
  );
}
