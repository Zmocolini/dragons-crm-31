"use client";

import { AlertTriangle, Check, CircleAlert, Clock, Minus, X } from "lucide-react";
import { NATIONALITY_LABEL, type Nationality } from "@/lib/candidates/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import {
  CELL_STATE_LABEL, COURIER_DOC_STATUS_LABEL,
  type CellResult, type CellState, type CourierDocStatus,
} from "@/lib/documents/rules";
import { cn } from "@/lib/utils/cn";

function ddmmyyyy(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}.${m}.${y}`;
}

const CELL_STYLE: Record<CellState, { color: string; Icon: typeof Check }> = {
  valid:          { color: "#22c55e", Icon: Check },
  expiring_soon:  { color: "#8b5cf6", Icon: Clock },
  expired:        { color: "#ef4444", Icon: AlertTriangle },
  missing:        { color: "#ef4444", Icon: X },
  pending_review: { color: "#f59e0b", Icon: CircleAlert },
  rejected:       { color: "#ef4444", Icon: X },
  na:             { color: "#64748b", Icon: Minus },
};

export function cellTooltip(colLabel: string, cell: CellResult): string {
  const { state, doc, daysLeft } = cell;
  switch (state) {
    case "valid":
      return doc?.expiryIso ? `${colLabel} validă până la ${ddmmyyyy(doc.expiryIso)}` : `${colLabel}: validă`;
    case "expiring_soon":
      return `${colLabel} expiră în ${daysLeft} zile (${ddmmyyyy(doc?.expiryIso ?? null)})`;
    case "expired":
      return `${colLabel} expirată la ${ddmmyyyy(doc?.expiryIso ?? null)}`;
    case "missing":
      return `${colLabel} lipsește`;
    case "pending_review":
      return `${colLabel}: document în verificare`;
    case "rejected":
      return `${colLabel}: document respins`;
    case "na":
      return `${colLabel}: nu se aplică acestui curier`;
  }
}

export function CellIcon({ colLabel, cell }: { colLabel: string; cell: CellResult }) {
  const { color, Icon } = CELL_STYLE[cell.state];
  const tip = cellTooltip(colLabel, cell);
  return (
    <span
      title={tip}
      aria-label={tip}
      role="img"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md"
      style={{ backgroundColor: `${color}1f` }}
    >
      <Icon size={14} style={{ color }} strokeWidth={2.4} />
      <span className="sr-only">{CELL_STATE_LABEL[cell.state]}</span>
    </span>
  );
}

const STATUS_STYLE: Record<CourierDocStatus, string> = {
  complete:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pending_review: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  missing:        "bg-rose-500/15 text-rose-300 border-rose-500/25",
  expiring_soon:  "bg-violet-500/15 text-violet-300 border-violet-500/25",
  expired:        "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

export function CourierDocStatusBadge({ status }: { status: CourierDocStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[status])}>
      {COURIER_DOC_STATUS_LABEL[status]}
    </span>
  );
}

const NAT_SHORT: Record<Nationality, string> = { ro: "RO", md: "MD", eu: "UE", in: "IN", bd: "BD", np: "NP", lk: "LK", non_eu: "Non-UE" };
export function NationalityBadge({ nationality }: { nationality: Nationality }) {
  return (
    <span
      title={NATIONALITY_LABEL[nationality]}
      aria-label={NATIONALITY_LABEL[nationality]}
      className="inline-flex items-center rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted"
    >
      {NAT_SHORT[nationality]}
    </span>
  );
}

const PLATFORM_STYLE: Record<PlatformKey, string> = {
  bolt: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  wolt: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  glovo: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
};
const PLATFORM_SHORT: Record<PlatformKey, string> = { bolt: "Bolt", wolt: "Wolt", glovo: "Glovo" };
export function PlatformBadges({ platforms }: { platforms: PlatformKey[] }) {
  if (platforms.length === 0) return <span className="text-[11px] text-fg-dim">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span key={p} className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold", PLATFORM_STYLE[p])}>
          {PLATFORM_SHORT[p]}
        </span>
      ))}
    </span>
  );
}

export { ddmmyyyy };
