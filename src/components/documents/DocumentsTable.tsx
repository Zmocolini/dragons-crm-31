"use client";

import {
  Activity, Archive, FilePlus2, FileText, MoreHorizontal, Send, Trash2, User, UserCog,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CourierAvatar } from "@/components/reports/bits";
import { EmptyState, Popover, Select } from "@/components/reports/controls";
import { CellIcon, CourierDocStatusBadge, NationalityBadge, PlatformBadges } from "./status-bits";
import { DOC_COLUMNS, type CourierDocRow } from "@/lib/documents/rules";
import { useDocumentFilters } from "@/lib/documents/filters-context";
import { cn } from "@/lib/utils/cn";

export type RowAction =
  | "view_docs" | "upload" | "edit_courier" | "open_profile" | "request_docs" | "view_activity" | "archive" | "delete";

const PAGE_SIZES = [10, 25, 50, 100];

export function DocumentsTable({
  rows,
  totalFiltered,
  selectedIds,
  onToggle,
  onToggleAll,
  onRowAction,
  onBulk,
  canManage,
  canDelete,
}: {
  rows: CourierDocRow[];
  totalFiltered: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onRowAction: (courierId: string, action: RowAction) => void;
  onBulk: (action: "request" | "export" | "responsible" | "verify" | "reminder") => void;
  canManage: boolean;
  canDelete: boolean;
}) {
  const { selectedCourierId, setSelectedCourierId, page, setPage, pageSize, setPageSize } = useDocumentFilters();
  const pageIds = rows.map((r) => r.courier.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return (
    <Card className="overflow-hidden">
      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent/[0.06] px-4 py-2.5">
          <span className="text-[12.5px] font-medium text-fg">{selectedIds.size} selectați</span>
          <div className="mx-1 h-4 w-px bg-line" />
          <BulkBtn onClick={() => onBulk("request")} icon={Send} label="Solicită documente" />
          <BulkBtn onClick={() => onBulk("export")} icon={FileText} label="Exportă" />
          <BulkBtn onClick={() => onBulk("responsible")} icon={UserCog} label="Schimbă responsabil" />
          <BulkBtn onClick={() => onBulk("verify")} icon={Activity} label="Verifică status" />
          <BulkBtn onClick={() => onBulk("reminder")} icon={Send} label="Trimite reminder" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
              <th className="px-4 py-2.5">
                <input type="checkbox" aria-label="Selectează toți" checked={allChecked} onChange={(e) => onToggleAll(pageIds, e.target.checked)} className="h-3.5 w-3.5 accent-violet-500" />
              </th>
              <th className="py-2.5 pr-2 font-medium">#</th>
              <th className="py-2.5 pr-2 font-medium">Curier</th>
              <th className="py-2.5 pr-2 font-medium">Naț.</th>
              <th className="py-2.5 pr-2 font-medium">Platforme</th>
              {DOC_COLUMNS.map((c) => <th key={c.key} className="py-2.5 pr-2 text-center font-medium" title={c.label}>{c.short}</th>)}
              <th className="py-2.5 pr-2 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = r.courier;
              const isSel = selectedCourierId === c.id;
              return (
                <tr key={c.id} className={cn("border-b border-line/50 hover:bg-white/[0.02]", isSel && "bg-accent/[0.06]")}>
                  <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Selectează ${c.fullName}`} checked={selectedIds.has(c.id)} onChange={() => onToggle(c.id)} className="h-3.5 w-3.5 accent-violet-500" /></td>
                  <td className="py-2.5 pr-2 text-fg-dim tabular-nums">{(page - 1) * pageSize + i + 1}</td>
                  <td className="py-2.5 pr-2">
                    <button type="button" onClick={() => setSelectedCourierId(c.id)} className="flex items-center gap-2 text-left">
                      <CourierAvatar name={c.fullName} size={26} />
                      <span className="min-w-0">
                        <span className="block max-w-[150px] truncate font-medium text-fg hover:underline">{c.fullName}</span>
                        <span className="block text-[11px] text-fg-dim">{c.phone}</span>
                      </span>
                    </button>
                  </td>
                  <td className="py-2.5 pr-2"><NationalityBadge nationality={c.nationality} /></td>
                  <td className="py-2.5 pr-2"><PlatformBadges platforms={c.platforms} /></td>
                  {DOC_COLUMNS.map((col) => (
                    <td key={col.key} className="py-2.5 pr-2 text-center"><div className="flex justify-center"><CellIcon colLabel={col.label} cell={r.cells[col.key]} /></div></td>
                  ))}
                  <td className="py-2.5 pr-2"><CourierDocStatusBadge status={r.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <RowMenu courierId={c.id} onAction={onRowAction} canManage={canManage} canDelete={canDelete} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="Nu există curieri care corespund filtrelor selectate." hint="Ajustează căutarea, taburile sau filtrele." />}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12px] text-fg-muted">
        <div className="flex items-center gap-2">
          <span>Afișează</span>
          <Select value={String(pageSize)} options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => setPageSize(Number(v))} className="w-[72px]" ariaLabel="Rânduri pe pagină" />
          <span>din {totalFiltered} curieri</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={cn("rounded-lg border border-line px-2.5 py-1", page <= 1 && "opacity-40")}>Înapoi</button>
          {pageNumbers(page, pageCount).map((n, idx) =>
            n === "..." ? <span key={`e${idx}`} className="px-1.5 text-fg-dim">…</span> :
            <button key={n} type="button" onClick={() => setPage(n as number)} className={cn("min-w-[30px] rounded-lg border px-2 py-1 tabular-nums", n === page ? "border-accent bg-accent/15 text-fg" : "border-line text-fg-muted hover:text-fg")}>{n}</button>
          )}
          <button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)} className={cn("rounded-lg border border-line px-2.5 py-1", page >= pageCount && "opacity-40")}>Înainte</button>
        </div>
      </div>
    </Card>
  );
}

function BulkBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Send; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-fg hover:bg-white/[0.06]">
      <Icon size={13} className="text-fg-dim" /> {label}
    </button>
  );
}

function RowMenu({ courierId, onAction, canManage, canDelete }: { courierId: string; onAction: (id: string, a: RowAction) => void; canManage: boolean; canDelete: boolean }) {
  const items: Array<{ action: RowAction; label: string; icon: typeof FileText; danger?: boolean; hidden?: boolean }> = [
    { action: "view_docs", label: "Vezi documente", icon: FileText },
    { action: "upload", label: "Încarcă document", icon: FilePlus2, hidden: !canManage },
    { action: "edit_courier", label: "Editează date curier", icon: UserCog, hidden: !canManage },
    { action: "open_profile", label: "Deschide profil", icon: User },
    { action: "request_docs", label: "Solicită documente", icon: Send, hidden: !canManage },
    { action: "view_activity", label: "Vezi activitate", icon: Activity },
    { action: "archive", label: "Arhivează document", icon: Archive, hidden: !canManage },
    { action: "delete", label: "Șterge document", icon: Trash2, danger: true, hidden: !canDelete },
  ];
  return (
    <Popover
      align="right"
      className="w-[210px] p-1"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label="Acțiuni" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg">
          <MoreHorizontal size={16} />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          {items.filter((it) => !it.hidden).map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.action} type="button" onClick={() => { onAction(courierId, it.action); close(); }}
                className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.05]", it.danger ? "text-[color:var(--color-danger)]" : "text-fg")}>
                <Icon size={14} className={it.danger ? "" : "text-fg-dim"} /> {it.label}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function pageNumbers(page: number, count: number): (number | "...")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const from = Math.max(2, page - 1), to = Math.min(count - 1, page + 1);
  if (from > 2) out.push("...");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < count - 1) out.push("...");
  out.push(count);
  return out;
}
