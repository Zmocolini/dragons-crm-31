"use client";

import Link from "next/link";
import {
  ArrowRight, Bell, ChevronRight, Crown, KeyRound, Laptop,
  Languages, Palette, Trash2,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/rbac/session";
import { useProfile } from "@/lib/profile/context";
import { ChangePasswordDialog } from "./dialogs/ChangePasswordDialog";
import { DeleteAccountDialog } from "./dialogs/DeleteAccountDialog";
import { PlanDialog } from "./dialogs/PlanDialog";
import type { ProfileTab } from "./ProfileTabs";
import { cn } from "@/lib/utils/cn";

type Props = {
  onOpenTab: (t: ProfileTab) => void;
};

export function RightColumn({ onOpenTab }: Props) {
  const { user } = useSession();
  const { profile } = useProfile();
  const [planOpen, setPlanOpen] = useState(false);
  const [pwOpen, setPwOpen]     = useState(false);
  const [delOpen, setDelOpen]   = useState(false);

  const plan = user.activeTenant.planUsage;
  const pct = Math.min(100, Math.round((plan.used / plan.total) * 100));

  return (
    <div className="space-y-4">
      {/* PLAN */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Crown size={16} />
          </span>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
              Planul tău
            </div>
            <div className="text-[15px] font-bold text-fg">{user.activeTenant.planLabel}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11.5px]">
            <span className="text-fg-muted">{plan.used} / {plan.total} curieri</span>
            <span className="font-mono font-bold text-fg">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg shadow-violet-900/30 transition-colors hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500"
        >
          Vezi detalii plan
          <ArrowRight size={13} />
        </button>
      </section>

      {/* ACCES RAPID */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="border-b border-line/70 px-5 py-3.5">
          <h3 className="text-[13.5px] font-semibold text-fg">Acces rapid</h3>
        </header>
        <ul className="divide-y divide-line/40">
          <QuickRow
            icon={<KeyRound size={14} />}
            title="Schimbă parola"
            subtitle="Actualizează parola contului tău"
            onClick={() => setPwOpen(true)}
          />
          <QuickRow
            icon={<Laptop size={14} />}
            title="Sesiuni active"
            subtitle="Vezi dispozitivele conectate"
            onClick={() => onOpenTab("security")}
          />
        </ul>
      </section>

      {/* PREFERINȚE CONT */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="border-b border-line/70 px-5 py-3.5">
          <h3 className="text-[13.5px] font-semibold text-fg">Preferințe cont</h3>
        </header>
        <ul className="divide-y divide-line/40">
          <QuickRow
            icon={<Bell size={14} />}
            title="Notificări"
            subtitle="Gestionează notificările în aplicație"
            onClick={() => onOpenTab("notifications")}
          />
          <QuickRow
            icon={<Languages size={14} />}
            title="Limbă"
            subtitle={profile.language === "ro" ? "Română" : "English"}
            onClick={() => onOpenTab("preferences")}
          />
          <QuickRow
            icon={<Palette size={14} />}
            title="Temă"
            subtitle={themeLabel(profile.theme)}
            onClick={() => onOpenTab("preferences")}
          />
        </ul>
      </section>

      {/* DANGER ZONE — 2 acțiuni distincte per spec: Recycle Bin (entități) + Șterge cont (personal) */}
      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
            <Trash2 size={15} />
          </span>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-rose-300/80">
              Zonă periculoasă
            </div>
            <div className="text-[14px] font-bold text-fg">Acțiuni ireversibile</div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <Link
            href="/profil/recycle-bin"
            className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition-colors hover:bg-card-hover"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-card-2 text-fg-muted">
              <Trash2 size={13} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12.5px] font-semibold text-fg">Elemente șterse</span>
              <span className="mt-0.5 block text-[10.5px] text-fg-dim">
                Restaurează sau șterge definitiv (curieri, documente, task-uri)
              </span>
            </span>
            <ChevronRight size={13} className="text-fg-dim" />
          </Link>

          <button
            type="button"
            onClick={() => setDelOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-left transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300">
              <Trash2 size={13} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12.5px] font-semibold text-rose-200">Șterge contul</span>
              <span className="mt-0.5 block text-[10.5px] text-rose-300/70">
                Șterge definitiv contul și toate datele personale
              </span>
            </span>
            <ChevronRight size={13} className="text-rose-300/70" />
          </button>
        </div>
      </section>

      {/* Dialogs */}
      <PlanDialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        used={plan.used}
        total={plan.total}
        label={user.activeTenant.planLabel}
      />
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
      <DeleteAccountDialog open={delOpen} onClose={() => setDelOpen(false)} />
    </div>
  );
}

function QuickRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
          "hover:bg-white/[0.03] focus-visible:outline-none focus-visible:bg-white/[0.03]",
        )}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
          {icon}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-semibold text-fg">{title}</span>
          <span className="mt-0.5 block text-[11px] text-fg-dim">{subtitle}</span>
        </span>
        {trailing}
        <ChevronRight size={13} className="text-fg-dim" />
      </button>
    </li>
  );
}

function themeLabel(t: string) {
  return t === "dark" ? "Dark (implicit)" : t === "light" ? "Light" : "System";
}
