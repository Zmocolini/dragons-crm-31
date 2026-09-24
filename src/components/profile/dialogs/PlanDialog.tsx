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
    couriers: "30 curieri",
    icon: Rocket,
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    ring: "ring-sky-400/40",
    features: [],
    ctaLabel: "Alege",
  },
  {
    key: "business",
    name: "Business",
    price: "299",
    priceSub: "RON / lună",
    monthly: 299,
    annualDiscount: 25,
    couriers: "200 curieri",
    icon: Crown,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    ring: "ring-violet-400/40",
    popular: true,
    features: [],
    ctaLabel: "Alege",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "custom",
    priceSub: "preț personalizat",
    monthly: 0,
    couriers: "nelimitat",
    icon: Building2,
    gradient: "from-amber-500 via-orange-600 to-red-700",
    ring: "ring-amber-400/40",
    features: [],
    ctaLabel: "Contact",
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

        {/* Tiere cards — compacte */}
        <div className="grid grid-cols-3 gap-2">
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
                  "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center",
                  t.popular
                    ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30"
                    : "border-line bg-card",
                )}
              >
                {t.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                    Popular
                  </span>
                )}
                <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white", t.gradient)}>
                  <Icon size={16} />
                </div>
                <div className="text-[13px] font-bold text-fg">{t.name}</div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[20px] font-black text-fg">{displayPrice}</span>
                  {t.key !== "enterprise" && <span className="text-[10px] text-fg-dim">RON</span>}
                </div>
                <div className="text-[10.5px] text-fg-muted">{t.couriers}</div>
                <button
                  type="button"
                  onClick={() => handleUpgrade(t)}
                  className={cn(
                    "mt-1 w-full rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors",
                    t.popular
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                      : "border border-line bg-card-hover text-fg hover:bg-white/[0.06]",
                  )}
                >
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
