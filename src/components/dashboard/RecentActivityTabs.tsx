"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Check, MoreHorizontal, Pencil, RotateCcw, User, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/Badge";
import { PlatformChip } from "@/components/ui/PlatformLogo";
import { formatShortDate } from "./shared";
import { COURIER_STATUS_LABEL, COURIER_STATUS_TONE, PENDING_ALERT_DAYS, PENDING_CRITICAL_DAYS } from "@/lib/couriers/types";
import { useCouriers } from "@/lib/couriers/context";
import { useSession } from "@/lib/rbac/session";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/components/ui/Toast";
import { EditCourierDialog } from "@/components/couriers/EditCourierDialog";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type {
  RecentCourier,
  RecentIssue,
  RecentPayment,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const PAYMENT_STATUS_LABEL = {
  platit: "Plătit",
  pending: "Pending",
  esuat: "Eșuat",
} as const;
const PAYMENT_STATUS_TONE = {
  platit: "success",
  pending: "warn",
  esuat: "danger",
} as const;

const ISSUE_SEVERITY_LABEL = {
  low: "Minor",
  medium: "Mediu",
  high: "Critic",
} as const;
const ISSUE_SEVERITY_TONE = {
  low: "neutral",
  medium: "warn",
  high: "danger",
} as const;

type Tab = "couriers" | "payments" | "issues";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "couriers", label: "Curieri recenți", href: "/curieri" },
  { key: "payments", label: "Plăți recente", href: "/plati" },
  { key: "issues", label: "Probleme", href: "/#urgente" },
];

type Props = {
  couriers: RecentCourier[];
  payments: RecentPayment[];
  issues: RecentIssue[];
};

export function RecentActivityTabs(props: Props) {
  const [tab, setTab] = useState<Tab>("couriers");
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-5 pt-3">
        <div
          role="tablist"
          aria-label="Activitate recentă"
          className="-mb-px flex flex-wrap items-center gap-1"
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative px-3 py-3 text-[13px] font-medium transition-colors",
                  active
                    ? "text-fg"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
        <Link
          href={activeTab.href}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          Vezi toți <ArrowRight size={12} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {tab === "couriers" && <CouriersTable rows={props.couriers} />}
        {tab === "payments" && <PaymentsTable rows={props.payments} />}
        {tab === "issues" && <IssuesTable rows={props.issues} />}
      </div>
    </section>
  );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TD({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
}) {
  return (
    <td
      onClick={onClick}
      className={cn("px-5 py-3 align-middle text-[13px] text-fg", className)}
    >
      {children}
    </td>
  );
}

function RowActionButton() {
  return (
    <button
      type="button"
      aria-label="Acțiuni rând"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim transition-colors hover:bg-white/[0.08] hover:text-fg"
    >
      <MoreHorizontal size={16} />
    </button>
  );
}

function CourierRowActionsMenu({
  courier,
  onEdit,
}: {
  courier: RecentCourier;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const { updateCourier } = useCouriers();
  const { user } = useSession();
  const { current } = useAuth();
  const isSubcontractor = user.role === "subcontractor_owner" || current?.role === "subcontractor_owner";
  const canManageStatus = !isSubcontractor;
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 190;
    const left = Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth));
    const top = rect.bottom + 4;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleActivate = () => {
    updateCourier(courier.id, { status: "active" });
    toast.success("Curier confirmat și activat!", courier.name);
    setOpen(false);
  };

  const handleReject = () => {
    updateCourier(courier.id, { status: "rejected" });
    toast.error("Curier marcat ca respins", courier.name);
    setOpen(false);
  };

  const handlePause = () => {
    updateCourier(courier.id, { status: "paused" });
    toast.success("Curier trecut în inactiv", courier.name);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Acțiuni pentru ${courier.name}`}
        aria-expanded={open}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim transition-colors hover:bg-white/[0.08] hover:text-fg",
          open && "bg-white/[0.08] text-fg",
        )}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 190 }}
          className="z-[1000] overflow-hidden rounded-xl border border-line bg-card-2 p-1 shadow-2xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {canManageStatus && courier.status === "pending" && (
            <>
              <button
                type="button"
                onClick={handleActivate}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
              >
                <Check size={14} className="text-emerald-400" />
                Activează curier
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-rose-300 hover:bg-rose-500/15"
              >
                <X size={14} className="text-rose-400" />
                Respinge curier
              </button>
              <div className="my-1 border-t border-line/60" />
            </>
          )}

          {canManageStatus && courier.status === "active" && (
            <button
              type="button"
              onClick={handlePause}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-amber-300 hover:bg-amber-500/15"
            >
              <Ban size={13} className="text-amber-400" />
              Trece în inactiv
            </button>
          )}

          {canManageStatus && (courier.status === "paused" || courier.status === "rejected" || courier.status === "stopped") && (
            <button
              type="button"
              onClick={handleActivate}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
            >
              <RotateCcw size={13} className="text-emerald-400" />
              Activează curier
            </button>
          )}

          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-fg-muted hover:bg-white/[0.05] hover:text-fg"
          >
            <Pencil size={13} />
            Editează date
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); router.push(`/curieri/${courier.id}`); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-fg-muted hover:bg-white/[0.05] hover:text-fg"
          >
            <User size={13} />
            Vezi profil complet
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

function CouriersTable({ rows }: { rows: RecentCourier[] }) {
  const { allRows, updateCourier } = useCouriers();
  const { user } = useSession();
  const { current } = useAuth();
  const isSubcontractor = user.role === "subcontractor_owner" || current?.role === "subcontractor_owner";
  const canManageStatus = !isSubcontractor;
  const [editingCourier, setEditingCourier] = useState<CourierRow | null>(null);
  const router = useRouter();
  const toast = useToast();
  const showOwner = rows.some((r) => r.owner);

  return (
    <>
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="border-b border-line/70">
          <tr>
            <TH>Nume</TH>
            <TH>Telefon</TH>
            <TH>Oraș</TH>
            <TH>Platformă</TH>
            {showOwner && <TH>Proveniență</TH>}
            <TH>Status</TH>
            <TH>Data</TH>
            <TH className="text-right pr-6">Acțiuni</TH>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => router.push(`/curieri/${r.id}`)}
              className="cursor-pointer transition-colors hover:bg-white/[0.02]"
            >
              <TD>
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} size={30} />
                  <span className="font-medium text-fg">{r.name}</span>
                </div>
              </TD>
              <TD className="font-mono text-[12.5px] text-fg-muted">{r.phone}</TD>
              <TD className="text-fg-muted">{r.city}</TD>
              <TD>
                <PlatformChip platform={r.platform} />
              </TD>
              {showOwner && (
                <TD>
                  {r.owner && (
                    <Badge tone={r.owner.kind === "internal" ? "info" : "warn"} className="whitespace-nowrap">
                      {r.owner.kind === "internal" ? "Intern" : `Subcontractor · ${r.owner.label}`}
                    </Badge>
                  )}
                </TD>
              )}
              <TD onClick={(e) => e.stopPropagation()}>
                {canManageStatus && r.status === "pending" ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateCourier(r.id, { status: "active" });
                        toast.success("Curier confirmat și activat!", r.name);
                      }}
                      title="Confirmă și activează curierul"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/35"
                    >
                      <Check size={12} /> Activează
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateCourier(r.id, { status: "rejected" });
                        toast.error("Curier marcat ca respins", r.name);
                      }}
                      title="Respinge curierul"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/35"
                    >
                      <X size={12} /> Respinge
                    </button>
                  </div>
                ) : r.pendingDays !== null && r.pendingDays >= PENDING_ALERT_DAYS ? (
                  <Badge tone={r.pendingDays >= PENDING_CRITICAL_DAYS ? "danger" : "warn"} className="whitespace-nowrap">
                    {COURIER_STATUS_LABEL[r.status]} · {r.pendingDays} zile
                  </Badge>
                ) : (
                  <Badge tone={COURIER_STATUS_TONE[r.status]}>{COURIER_STATUS_LABEL[r.status]}</Badge>
                )}
              </TD>
              <TD className="font-mono text-[12.5px] text-fg-muted">
                {formatShortDate(r.registeredAt)}
              </TD>
              <TD className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                <CourierRowActionsMenu
                  courier={r}
                  onEdit={() => {
                    const full = allRows.find((c) => c.id === r.id);
                    if (full) setEditingCourier(full);
                  }}
                />
              </TD>
            </tr>
          ))}
        </tbody>
      </table>

      {editingCourier && (
        <EditCourierDialog
          row={editingCourier}
          onClose={() => setEditingCourier(null)}
        />
      )}
    </>
  );
}

function PaymentsTable({ rows }: { rows: RecentPayment[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse">
      <thead className="border-b border-line/70">
        <tr>
          <TH>Curier</TH>
          <TH>Sumă</TH>
          <TH>Metodă</TH>
          <TH>Status</TH>
          <TH>Data</TH>
          <TH className="text-right pr-6">Acțiuni</TH>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/40">
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
            <TD>
              <div className="flex items-center gap-3">
                <Avatar name={r.courierName} size={30} />
                <span className="font-medium text-fg">{r.courierName}</span>
              </div>
            </TD>
            <TD className="font-mono font-semibold text-fg">
              {r.amount.toLocaleString("ro-RO")} RON
            </TD>
            <TD className="capitalize text-fg-muted">{r.method}</TD>
            <TD>
              <Badge tone={PAYMENT_STATUS_TONE[r.status]}>
                {PAYMENT_STATUS_LABEL[r.status]}
              </Badge>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">
              {formatShortDate(r.paidAt)}
            </TD>
            <TD className="text-right pr-4">
              <RowActionButton />
            </TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IssuesTable({ rows }: { rows: RecentIssue[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse">
      <thead className="border-b border-line/70">
        <tr>
          <TH>Problemă</TH>
          <TH>Curier</TH>
          <TH>Severitate</TH>
          <TH>Deschis</TH>
          <TH className="text-right pr-6">Acțiuni</TH>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/40">
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
            <TD className="font-medium text-fg">{r.title}</TD>
            <TD>
              <div className="flex items-center gap-3">
                <Avatar name={r.courierName} size={28} />
                <span className="text-fg-muted">{r.courierName}</span>
              </div>
            </TD>
            <TD>
              <Badge tone={ISSUE_SEVERITY_TONE[r.severity]}>
                {ISSUE_SEVERITY_LABEL[r.severity]}
              </Badge>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">
              {formatShortDate(r.createdAt)}
            </TD>
            <TD className="text-right pr-4">
              <RowActionButton />
            </TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
