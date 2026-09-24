"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Rocket, Building2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { cn } from "@/lib/utils/cn";

type Tier = {
  key: "starter" | "business" | "enterprise";
  name: string;
  price: string;
  priceSub: string;
  monthly: number;      // RON/lună (pentru comparație anual vs lunar)
  annualDiscount?: number; // %
  couriers: string;
  icon: LucideIcon;
  gradient: string;
  ring: string;
  popular?: boolean;
  features: string[];
  ctaLabel: string;
};

const TIERS: Tier[] = [
  {
    key: "starter",
    name: "Starter",
    price: "99",
    priceSub: "RON / lună",
    monthly: 99,
    annualDiscount: 20,
    couriers: "până la 30 curieri",
    icon: Rocket,
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    ring: "ring-sky-400/40",
    features: [
      "30 curieri activi în flotă",
      "Import Bolt / Wolt / Glovo",
      "Calcul automat plăți",
      "Cont dublu (perechi manuale)",
      "1 utilizator Global Owner",
      "Backup automat + 30 zile istoric",
      "Suport email",
    ],
    ctaLabel: "Începe cu Starter",
  },
  {
    key: "business",
    name: "Business",
    price: "299",
    priceSub: "RON / lună",
    monthly: 299,
    annualDiscount: 25,
    couriers: "până la 200 curieri",
    icon: Crown,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    ring: "ring-violet-400/40",
    popular: true,
    features: [
      "200 curieri activi în flotă",
      "Toate din Starter",
      "Utilizatori subcontractori nelimitați",
      "AI Copilot inclus (Groq)",
      "Cloudflare R2 pentru documente (5 GB)",
      "Tichete suport centralizate",
      "Impersonare subcontractor (Global Owner)",
      "Backup + 90 zile istoric",
      "Suport chat prioritar",
    ],
    ctaLabel: "Upgrade la Business",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "custom",
    priceSub: "preț personalizat",
    monthly: 0,
    couriers: "curieri nelimitați",
    icon: Building2,
    gradient: "from-amber-500 via-orange-600 to-red-700",
    ring: "ring-amber-400/40",
    features: [
      "Curieri nelimitați",
      "Toate din Business",
      "Multi-flotă (mai multe firme)",
      "Domeniu propriu (crm.firmata.ro)",
      "SLA 99.9% + integrare custom",
      "R2 nelimitat pentru documente",
      "API acces pentru integrări (ERP, contabilitate)",
      "Onboarding + training dedicat",
      "Account manager dedicat",
    ],
    ctaLabel: "Contactează-ne",
  },
];

export function PlanDialog({
  open, onClose, used, total, label,
}: {
  open: boolean; onClose: () => void; used: number; total: number; label: string;
}) {
  const toast = useToast();
  const { logActivity } = useProfile();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const handleUpgrade = (tier: Tier) => {
    if (tier.key === "enterprise") {
      window.location.href = "mailto:contact@dragonsalliance.eu?subject=CRM Enterprise - Cerere ofertă";
      return;
    }
    toast.info("Plată online în curând", `Contactează contact@dragonsalliance.eu pentru upgrade la ${tier.name}.`);
    logActivity?.({ kind: "info", title: `Upgrade cerut: ${tier.name}` });
  };

  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Planuri Dragons CRM">
      <div className="flex flex-col gap-5">
        {/* Header planul curent */}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <Crown size={17} className="text-emerald-300" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-200">Plan activ</div>
              <div className="text-[15px] font-bold text-fg">{label}</div>
              <div className="mt-1 text-[11.5px] text-fg-muted">
                <span className="font-mono font-semibold text-fg">{used}</span> / {total} curieri folosiți ({pct}%)
              </div>
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 rounded-lg border border-line bg-card-hover p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              billing === "monthly" ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
            )}
          >
            Lunar
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              billing === "annual" ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
            )}
          >
            Anual <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-200">-25%</span>
          </button>
        </div>

        {/* Tiere cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const displayPrice = t.key === "enterprise"
              ? "custom"
              : billing === "annual" && t.annualDiscount
                ? String(Math.round(t.monthly * (1 - t.annualDiscount / 100)))
                : t.price;
            return (
              <div
                key={t.key}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-2xl border p-5",
                  t.popular
                    ? "border-violet-500/60 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.05] ring-1 ring-violet-500/30"
                    : "border-line bg-card",
                )}
              >
                {t.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                    Recomandat
                  </span>
                )}

                <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white", t.gradient)}>
                  <Icon size={22} />
                </div>

                <div className="mt-3">
                  <div className="text-[16px] font-bold text-fg">{t.name}</div>
                  <div className="text-[11.5px] text-fg-muted">{t.couriers}</div>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[28px] font-black text-fg">{displayPrice}</span>
                  <span className="text-[11.5px] text-fg-muted">
                    {t.key === "enterprise" ? "" : billing === "annual" ? "RON / lună (facturat anual)" : t.priceSub}
                  </span>
                </div>

                <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-fg-muted">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleUpgrade(t)}
                  className={cn(
                    "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold transition-colors",
                    t.popular
                      ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500"
                      : "border border-line bg-card-hover text-fg hover:bg-white/[0.06]",
                  )}
                >
                  <Sparkles size={13} />
                  {t.ctaLabel}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer trust */}
        <div className="rounded-lg border border-line bg-card-hover p-3 text-center text-[11px] text-fg-muted">
          Fără card la înscriere · Anulează oricând · Facturi automate · Suport în română
        </div>
      </div>
    </Dialog>
  );
}
