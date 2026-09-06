"use client";

import Link from "next/link";
import { ChevronRight, FileText, Plus, Sparkles, UserPlus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { AddCandidateDialog } from "./dialogs/AddCandidateDialog";
import { AddCourierDialog } from "./dialogs/AddCourierDialog";
import { useSession } from "@/lib/rbac/session";
import type { Permission } from "@/lib/rbac/roles";

type SecondaryAction =
  | { kind: "link"; label: string; href: string; icon: LucideIcon; permission: Permission }
  | { kind: "dialog"; id: "add-candidate"; label: string; icon: LucideIcon; permission: Permission };

const SECONDARY_ACTIONS: SecondaryAction[] = [
  { kind: "dialog", id: "add-candidate", label: "Adaugă candidat",     icon: UserPlus, permission: "candidates.create" },
  { kind: "link",   label: "Încarcă document",   href: "/documente/nou",  icon: FileText, permission: "documents.upload" },
  { kind: "link",   label: "Înregistrează plată", href: "/plati/nou",     icon: Wallet,   permission: "payments.create" },
  { kind: "link",   label: "Raport rapid",       href: "/rapoarte/rapid", icon: Sparkles, permission: "reports.view" },
];

export function QuickActionsPanel() {
  const { can } = useSession();
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [addCourierOpen, setAddCourierOpen]     = useState(false);

  const visibleSecondary = SECONDARY_ACTIONS.filter((a) => can(a.permission));

  return (
    <div className="space-y-2">
      {can("couriers.create") && (
        <button
          type="button"
          onClick={() => setAddCourierOpen(true)}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-3 text-[13.5px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)] transition-all hover:shadow-[0_10px_28px_-6px_rgba(99,102,241,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100"
          />
          <Plus size={16} className="relative" strokeWidth={2.5} />
          <span className="relative">Curier nou</span>
        </button>
      )}

      {visibleSecondary.map((action) => {
        const Icon = action.icon;
        const cls =
          "group flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";

        if (action.kind === "dialog") {
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => setAddCandidateOpen(true)}
              className={cls}
            >
              <Icon size={15} strokeWidth={2} className="text-fg-dim group-hover:text-fg-muted" />
              <span className="flex-1 text-left">{action.label}</span>
              <ChevronRight size={14} className="text-fg-dim" />
            </button>
          );
        }

        return (
          <Link key={action.href} href={action.href} className={cls}>
            <Icon size={15} strokeWidth={2} className="text-fg-dim group-hover:text-fg-muted" />
            <span className="flex-1">{action.label}</span>
            <ChevronRight size={14} className="text-fg-dim" />
          </Link>
        );
      })}

      <AddCandidateDialog open={addCandidateOpen} onClose={() => setAddCandidateOpen(false)} />
      <AddCourierDialog open={addCourierOpen} onClose={() => setAddCourierOpen(false)} />
    </div>
  );
}
