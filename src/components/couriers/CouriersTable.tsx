"use client";

import { Bike, Car, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { CourierStatus, VehicleType } from "@/lib/couriers/types";
import { COURIER_STATUS_LABEL, COURIER_STATUS_TONE } from "@/lib/couriers/types";
import { useDocuments } from "@/lib/documents/context";
import type { CourierRowAction } from "./CourierRowMenu";
import { CourierWaitlistButton } from "./CourierWaitlistButton";
import { PLATFORM_NAME } from "./CouriersWaitingPanel";
import type { PlatformKey } from "@/lib/dashboard/types";

type Props = {
  rows: CourierRow[];
  totalMatching: number;
  onRowClick: (row: CourierRow) => void;
  onRowAction: (action: CourierRowAction, row: CourierRow) => void;
  onRowDelete?: (row: CourierRow) => void;
  onRowEdit?: (row: CourierRow) => void;
  onRowToggleStatus?: (row: CourierRow) => void;
  /** Segmentul „În așteptare": platformele în așteptare devin chip-uri cu Activat / Scoate. */
  waitingMode?: boolean;
  onActivateWaiting?: (row: CourierRow, platform: PlatformKey) => void;
  onRemoveWaiting?: (row: CourierRow, platform: PlatformKey) => void;
  /** Dacă e dat, apare coloana Subcontractor (vederea Global Owner pe toate flotele). */
  ownerLabel?: (row: CourierRow) => string;
  loading?: boolean;
};

const VEHICLE_ICON: Record<VehicleType, LucideIcon> = {
  bike:    Bike,
  e_bike:  Zap,
  scooter: Bike,
  car:     Car,
};

const STATUS_TONE = COURIER_STATUS_TONE;

export function CouriersTable({ rows, totalMatching, onRowClick, onRowAction, onRowDelete, onRowEdit, onRowToggleStatus, waitingMode, onActivateWaiting, onRemoveWaiting, ownerLabel, loading }: Props) {
  const { documentsForSubject } = useDocuments();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-fg-muted">
        Se încarcă...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="text-[14px] font-semibold text-fg">Niciun curier găsit</div>
        <div className="max-w-md text-[12.5px] text-fg-muted">
          {totalMatching === 0
            ? waitingMode
              ? "Nimeni nu așteaptă loc. Adaugă platforme în așteptare la un curier (butonul din stânga rândului) sau din „Curier nou”."
              : "Ajustează filtrele sau căutarea pentru a vedea rezultate."
            : "Această pagină nu conține curieri. Încearcă altă pagină."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto -mx-2 px-2">
      <table className="w-full min-w-[640px] table-fixed text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-dim">
            <th className="w-[52px] px-2 py-2.5" aria-label="Așteaptă" />
            <th className="px-3 py-2.5">Curier</th>
            {ownerLabel && <th className="w-[130px] px-2 py-2.5">Subcontractor</th>}
            <th className={waitingMode ? "w-[300px] px-2 py-2.5" : "w-[110px] px-2 py-2.5"}>Platforme</th>
            <th className="w-[110px] px-2 py-2.5">Documente</th>
            <th className="w-[110px] px-2 py-2.5">Status</th>
            <th className="w-[100px] px-2 py-2.5 text-right">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const VIcon = VEHICLE_ICON[row.vehicleType];
            const docsCount = documentsForSubject(row.id).length;
            return (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                className="group cursor-pointer border-b border-line/60 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-2 py-3 align-middle">
                  <CourierWaitlistButton row={row} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.fullName} size={32} />
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[13px] font-semibold text-fg">{row.fullName}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-fg-dim">
                        <VIcon size={10} strokeWidth={2} className="text-fg-dim" />
                        <span className="truncate">{row.city} · {row.vehicleModel}</span>
                      </div>
                    </div>
                  </div>
                </td>
                {ownerLabel && (
                  <td className="truncate px-2 py-3 text-fg-muted">{ownerLabel(row)}</td>
                )}
                <td className="px-2 py-3" onClick={waitingMode ? (e) => e.stopPropagation() : undefined}>
                  <div className="flex flex-wrap items-center gap-1">
                    {row.platforms.map((p) => (
                      <span key={p} title={`${PLATFORM_NAME[p]}: activ`}>
                        <PlatformLogo platform={p} size={20} rounded="md" />
                      </span>
                    ))}
                    {(row.waitlistedPlatforms ?? []).map((p) =>
                      waitingMode ? (
                        <span
                          key={`w-${p}`}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 py-0.5 pl-1.5 pr-1 text-[11px] font-semibold text-amber-100"
                        >
                          <PlatformLogo platform={p} size={14} rounded="md" />
                          {PLATFORM_NAME[p]}
                          <button
                            type="button"
                            onClick={() => onActivateWaiting?.(row, p)}
                            title={`Marchează activat pe ${PLATFORM_NAME[p]}`}
                            className="ml-0.5 inline-flex h-5 items-center gap-0.5 rounded bg-emerald-500/25 px-1.5 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/40"
                          >
                            <Plus size={9} />
                            Activat
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveWaiting?.(row, p)}
                            aria-label={`Scoate din așteptarea pentru ${PLATFORM_NAME[p]}`}
                            title="Scoate din așteptare"
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-amber-200 hover:bg-amber-500/25 hover:text-amber-50"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ) : (
                        <span
                          key={`w-${p}`}
                          title={`${PLATFORM_NAME[p]}: în așteptare`}
                          className="rounded-md opacity-60 ring-2 ring-amber-400/70 ring-offset-1 ring-offset-transparent"
                        >
                          <PlatformLogo platform={p} size={20} rounded="md" />
                        </span>
                      ),
                    )}
                  </div>
                </td>
                <td className="px-2 py-3">
                  {docsCount > 0 ? (
                    <Badge tone="success">{docsCount} încărcate</Badge>
                  ) : (
                    <Badge tone="warn">Lipsă</Badge>
                  )}
                </td>
                <td className="px-2 py-3">
                  {onRowToggleStatus ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRowToggleStatus(row); }}
                      aria-pressed={row.status === "active"}
                      title={row.status === "active" ? "Click pentru a dezactiva" : "Click pentru a activa"}
                      className={row.status === "active"
                        ? "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                        : "inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-[12px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/25"
                      }
                    >
                      <span className={row.status === "active" ? "inline-block h-2 w-2 rounded-full bg-emerald-400" : "inline-block h-2 w-2 rounded-full bg-rose-400"} />
                      {row.status === "active" ? "Activ" : "Inactiv"}
                    </button>
                  ) : (
                    <Badge tone={STATUS_TONE[row.status]}>{COURIER_STATUS_LABEL[row.status]}</Badge>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {onRowEdit && (
                      <button
                        type="button"
                        onClick={() => onRowEdit(row)}
                        aria-label={`Editează ${row.fullName}`}
                        title="Editează"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim transition-colors hover:bg-white/[0.06] hover:text-fg"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    )}
                    {onRowDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Ștergi definitiv curierul „${row.fullName}”? Acțiunea nu poate fi anulată.`)) {
                            onRowDelete(row);
                          }
                        }}
                        aria-label={`Șterge ${row.fullName}`}
                        title="Șterge curier"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
