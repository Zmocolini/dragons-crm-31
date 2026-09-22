"use client";

import { FileSpreadsheet } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatInt, formatRon, type FinancialRow } from "@/lib/reports/analytics";
import { PLATFORM_COLOR } from "@/lib/reports/facts";

export function FinancialTable({
  rows,
  total,
  onExportExcel,
}: {
  rows: FinancialRow[];
  total: FinancialRow;
  onExportExcel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Situație financiară detaliată</CardTitle>
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12px] font-medium text-fg hover:bg-white/[0.06]"
        >
          <FileSpreadsheet size={14} className="text-[color:var(--color-success)]" /> Exportă Excel
        </button>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-fg-dim">
              <th className="pb-2 pr-3 font-medium">Platformă</th>
              <th className="pb-2 pr-3 text-right font-medium">Comenzi</th>
              <th className="pb-2 pr-3 text-right font-medium">Venit brut</th>
              <th className="pb-2 pr-3 text-right font-medium">Comisioane</th>
              <th className="pb-2 pr-3 text-right font-medium">Deduceri</th>
              <th className="pb-2 pr-3 text-right font-medium">Plăți efectuate</th>
              <th className="pb-2 text-right font-medium">De plătit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.platform + r.label} className="border-t border-line/60">
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-2 font-semibold text-fg">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PLATFORM_COLOR[r.platform] }} />
                    {r.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-fg-muted">{formatInt(r.orders)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-fg">{formatRon(r.gross)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-fg-muted">{formatRon(r.commission)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-fg-muted">{formatRon(r.deductions)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-[color:var(--color-success)]">{formatRon(r.paid)}</td>
                <td className="py-2.5 text-right tabular-nums text-[color:var(--color-warn)]">{formatRon(r.toPay)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-line">
              <td className="py-2.5 pr-3 font-bold text-fg">Total</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-fg">{formatInt(total.orders)}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-fg">{formatRon(total.gross)}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-fg">{formatRon(total.commission)}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-fg">{formatRon(total.deductions)}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-fg">{formatRon(total.paid)}</td>
              <td className="py-2.5 text-right font-bold tabular-nums text-fg">{formatRon(total.toPay)}</td>
            </tr>
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
