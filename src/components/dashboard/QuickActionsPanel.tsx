"use client";

import Link from "next/link";
import { ChevronRight, FileText, Plus, Sparkles, UserPlus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { AddCandidateDialog } from "./dialogs/AddCandidateDialog";
import { AddCourierDialog } from "./dialogs/AddCourierDialog";
import { RecordPaymentDialog } from "./dialogs/RecordPaymentDialog";
import { useSession } from "@/lib/rbac/session";
import type { Permission, Role } from "@/lib/rbac/roles";

// Matricea Dashboard Quick Actions (spec Dragon Delivery):
//   Adaugă candidat     -> oricine cu candidates.create (HR + Owner + Manager)
//   Curier nou          -> oricine cu couriers.create   (Owner + Manager)
//   Încarcă document    -> secundar; upload rapid ad-hoc (Owner + Manager + HR)
//   Înregistrează plată -> DOAR Owner + Operator plăți
//   Raport rapid        -> DOAR Owner + Manager (subcontractor_owner)
// TODO(real-users): mută restricțiile pe server actions cu authorize(role, permission).

type PrimaryLink = {
  kind: "link";
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  roles?: Role[];
};
type PrimaryDialog = {
  kind: "dialog";
  id: "add-candidate" | "record-payment";
  label: string;
  icon: LucideIcon;
  permission: Permission;
  roles?: Role[];
};
type PrimaryAction = PrimaryLink | PrimaryDialog;

const PRIMARY_ACTIONS: PrimaryAction[] = [
  { kind: "dialog", id: "add-candidate", label: "Adaugă candidat", icon: UserPlus, permission: "candidates.create" },
  {
    kind: "dialog",
    id: "record-payment",
    label: "Înregistrează plată",
    icon: Wallet,
    permission: "payments.create",
    roles: ["global_owner", "subcontractor_owner", "operator_payments"],
  },
  {
    kind: "link",
    label: "Raport rapid",
    href: "/rapoarte/rapid",
    icon: Sparkles,
    permission: "reports.view",
    roles: ["global_owner", "subcontractor_owner"],
  },
];

const SECONDARY_ACTION = {
  label: "Încarcă document",
  href: "/documente/nou",
  icon: FileText,
  permission: "documents.upload" as Permission,
};

export function QuickActionsPanel() {
  const { can, user } = useSession();
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [addCourierOpen, setAddCourierOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const visiblePrimary = PRIMARY_ACTIONS.filter((a) => {
    if (!can(a.permission)) return false;
    if ("roles" in a && a.roles && !a.roles.includes(user.role)) return false;
    return true;
  });

  const canUploadDoc = can(SECONDARY_ACTION.permission);

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

      {visiblePrimary.map((action) => {
        const Icon = action.icon;
        const cls =
          "group flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";

        if (action.kind === "dialog") {
          const onClick = () => {
            if (action.id === "add-candidate") setAddCandidateOpen(true);
            else if (action.id === "record-payment") setRecordPaymentOpen(true);
          };
          return (
            <button
              key={action.id}
              type="button"
              onClick={onClick}
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

      {canUploadDoc && (
        <div className="pt-1.5">
          <div className="mb-1.5 flex items-center gap-2 px-0.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-fg-dim/70">
              Ad-hoc
            </span>
            <div className="h-px flex-1 bg-line/60" />
          </div>
          <Link
            href={SECONDARY_ACTION.href}
            className="group flex w-full items-center gap-2.5 rounded-lg border border-line/60 bg-transparent px-3 py-2 text-[12px] font-medium text-fg-dim transition-colors hover:bg-card-hover hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <SECONDARY_ACTION.icon size={13.5} strokeWidth={2} className="text-fg-dim/80" />
            <span className="flex-1">{SECONDARY_ACTION.label}</span>
            <ChevronRight size={12} className="text-fg-dim/70" />
          </Link>
        </div>
      )}

      <AddCandidateDialog open={addCandidateOpen} onClose={() => setAddCandidateOpen(false)} />
      <AddCourierDialog open={addCourierOpen} onClose={() => setAddCourierOpen(false)} />
      <RecordPaymentDialog open={recordPaymentOpen} onClose={() => setRecordPaymentOpen(false)} />
    </div>
  );
}
