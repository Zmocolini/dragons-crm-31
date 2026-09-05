"use client";

import Link from "next/link";
import {
  Bike, ChevronLeft, FileText, Home, Trash2, UserPlus, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import type { RecycleItem } from "@/lib/profile/types";
import { cn } from "@/lib/utils/cn";

const ENTITY_ICON: Record<RecycleItem["entityType"], LucideIcon> = {
  courier:   Bike,
  document:  FileText,
  candidate: UserPlus,
  task:      Users,
  note:      FileText,
  vehicle:   Bike,
};

const ENTITY_LABEL: Record<RecycleItem["entityType"], string> = {
  courier: "Curier",
  document: "Document",
  candidate: "Candidat",
  task: "Task",
  note: "Notă",
  vehicle: "Vehicul",
};

export default function RecycleBinPage() {
  const { recycle, restoreRecycle, purgeRecycle } = useProfile();
  const toast = useToast();
  const [purgeTarget, setPurgeTarget] = useState<RecycleItem | null>(null);

  function restore(item: RecycleItem) {
    // TODO(real-users): server action restoreItem(entityType, id) + revalidate lists.
    restoreRecycle(item.id);
    toast.success("Element restaurat.", `${ENTITY_LABEL[item.entityType]}: ${item.name}`);
  }

  function purge() {
    if (!purgeTarget) return;
    // TODO(real-users): server action hardDelete(entityType, id) + audit log.
    purgeRecycle(purgeTarget.id);
    toast.error("Element șters definitiv.", `${ENTITY_LABEL[purgeTarget.entityType]}: ${purgeTarget.name}`);
    setPurgeTarget(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-6 md:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
          <Home size={12} />
          Dashboard
        </Link>
        <ChevronDot />
        <Link href="/profil" className="inline-flex items-center gap-1 hover:text-fg">
          Profilul meu
        </Link>
        <ChevronDot />
        <span className="text-fg">Elemente șterse</span>
      </nav>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
              <Trash2 size={18} />
            </span>
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-fg md:text-[28px]">
                Elemente șterse
              </h1>
              <p className="mt-1 text-[13px] text-fg-muted">
                Restaurează sau șterge definitiv elementele mutate în coșul de gunoi.
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/profil"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line bg-card-2 px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          <ChevronLeft size={13} />
          Înapoi la profil
        </Link>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
        {recycle.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
              <Trash2 size={20} />
            </span>
            <div className="text-[15px] font-semibold text-fg">Coș de gunoi gol</div>
            <p className="max-w-sm text-[12.5px] text-fg-muted">
              Elementele șterse din curieri, documente, candidați, task-uri sau note apar aici pentru
              30 de zile înainte de a fi șterse definitiv.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
            >
              Înapoi la Dashboard
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="border-b border-line/50">
                <tr>
                  <TH>Tip</TH>
                  <TH>Nume</TH>
                  <TH>Șters de</TH>
                  <TH>Data ștergerii</TH>
                  <TH>Expiră la</TH>
                  <TH className="text-right pr-6">Acțiuni</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {recycle.map((it) => {
                  const Icon = ENTITY_ICON[it.entityType];
                  return (
                    <tr key={it.id} className="text-[12.5px]">
                      <TD>
                        <span className="inline-flex items-center gap-2 rounded-md border border-line bg-card-2/60 px-2 py-0.5 text-[10.5px] font-semibold text-fg-muted">
                          <Icon size={12} />
                          {ENTITY_LABEL[it.entityType]}
                        </span>
                      </TD>
                      <TD className="font-semibold text-fg">{it.name}</TD>
                      <TD className="text-fg-muted">{it.deletedBy}</TD>
                      <TD className="font-mono text-fg-muted">{formatShort(it.deletedAt)}</TD>
                      <TD className="font-mono text-rose-300">{formatShort(it.expiresAt)}</TD>
                      <TD className="text-right pr-4">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => restore(it)}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                          >
                            Restaurează
                          </button>
                          <button
                            type="button"
                            onClick={() => setPurgeTarget(it)}
                            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                          >
                            Șterge definitiv
                          </button>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        title="Șterge definitiv?"
        description="Acest element va fi eliminat permanent. Acțiunea nu poate fi anulată."
      >
        {purgeTarget && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-[12.5px] text-rose-100">
            <strong className="text-fg">{ENTITY_LABEL[purgeTarget.entityType]}: </strong>
            {purgeTarget.name}
          </div>
        )}
        <DialogFooter>
          <button
            type="button"
            onClick={() => setPurgeTarget(null)}
            className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={purge}
            className="rounded-lg bg-rose-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-rose-500"
          >
            Șterge definitiv
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function ChevronDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-fg-dim">
      <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim",
        className,
      )}
    >
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
}

function formatShort(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"][d.getMonth()];
  return `${day} ${mon} ${d.getFullYear()}`;
}
