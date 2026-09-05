"use client";

import Link from "next/link";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/Badge";
import { PlatformChip } from "@/components/ui/PlatformLogo";
import {
  formatShortDate,
  STATUS_LABEL,
  STATUS_TONE,
} from "./shared";
import type {
  RecentActivation,
  RecentCandidate,
  RecentCourier,
  RecentIssue,
  RecentPayment,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const CANDIDATE_STAGE_LABEL = {
  nou: "Nou",
  sunat: "Sunat",
  interviu: "Interviu",
  documente: "Documente",
} as const;
const CANDIDATE_STAGE_TONE = {
  nou: "info",
  sunat: "warn",
  interviu: "accent",
  documente: "success",
} as const;

const ACTIVATION_STATUS_LABEL = {
  finalizat: "Finalizat",
  in_proces: "În proces",
  blocat: "Blocat",
} as const;
const ACTIVATION_STATUS_TONE = {
  finalizat: "success",
  in_proces: "warn",
  blocat: "danger",
} as const;

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

type Tab = "couriers" | "candidates" | "activations" | "payments" | "issues";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "couriers", label: "Curieri recenți", href: "/curieri" },
  { key: "candidates", label: "Candidați noi", href: "/candidati" },
  { key: "activations", label: "Activări", href: "/activari" },
  { key: "payments", label: "Plăți recente", href: "/plati" },
  { key: "issues", label: "Probleme", href: "/probleme" },
];

type Props = {
  couriers: RecentCourier[];
  candidates: RecentCandidate[];
  activations: RecentActivation[];
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
        {tab === "candidates" && <CandidatesTable rows={props.candidates} />}
        {tab === "activations" && <ActivationsTable rows={props.activations} />}
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

function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim transition-colors hover:bg-white/[0.05] hover:text-fg-muted"
    >
      <MoreHorizontal size={16} />
    </button>
  );
}

function CouriersTable({ rows }: { rows: RecentCourier[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse">
      <thead className="border-b border-line/70">
        <tr>
          <TH>Nume</TH>
          <TH>Telefon</TH>
          <TH>Oraș</TH>
          <TH>Platformă</TH>
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
                <Avatar name={r.name} size={30} />
                <span className="font-medium text-fg">{r.name}</span>
              </div>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">{r.phone}</TD>
            <TD className="text-fg-muted">{r.city}</TD>
            <TD>
              <PlatformChip platform={r.platform} />
            </TD>
            <TD>
              <Badge tone={STATUS_TONE[r.status]}>
                {STATUS_LABEL[r.status]}
              </Badge>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">
              {formatShortDate(r.registeredAt)}
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

function CandidatesTable({ rows }: { rows: RecentCandidate[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse">
      <thead className="border-b border-line/70">
        <tr>
          <TH>Nume</TH>
          <TH>Telefon</TH>
          <TH>Oraș</TH>
          <TH>Sursă</TH>
          <TH>Stadiu</TH>
          <TH>Adăugat</TH>
          <TH className="text-right pr-6">Acțiuni</TH>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/40">
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
            <TD>
              <div className="flex items-center gap-3">
                <Avatar name={r.name} size={30} />
                <span className="font-medium text-fg">{r.name}</span>
              </div>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">{r.phone}</TD>
            <TD className="text-fg-muted">{r.city}</TD>
            <TD className="text-fg-muted">{r.source}</TD>
            <TD>
              <Badge tone={CANDIDATE_STAGE_TONE[r.stage]}>
                {CANDIDATE_STAGE_LABEL[r.stage]}
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

function ActivationsTable({ rows }: { rows: RecentActivation[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse">
      <thead className="border-b border-line/70">
        <tr>
          <TH>Curier</TH>
          <TH>Platformă</TH>
          <TH>Oraș</TH>
          <TH>Status</TH>
          <TH>Finalizat</TH>
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
            <TD>
              <PlatformChip platform={r.platform} />
            </TD>
            <TD className="text-fg-muted">{r.city}</TD>
            <TD>
              <Badge tone={ACTIVATION_STATUS_TONE[r.status]}>
                {ACTIVATION_STATUS_LABEL[r.status]}
              </Badge>
            </TD>
            <TD className="font-mono text-[12.5px] text-fg-muted">
              {formatShortDate(r.completedAt)}
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
