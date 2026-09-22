"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useDocuments } from "@/lib/documents/context";
import { useSession } from "@/lib/rbac/session";
import { useToast } from "@/components/ui/Toast";
import { DOCUMENT_TYPE_LABEL, type DocumentStatus, type DocumentType } from "@/lib/documents/types";
import { cn } from "@/lib/utils/cn";

type ParsedRow = {
  courierId: string;
  type: DocumentType;
  status: DocumentStatus;
  expiryIso: string | null;
  fileName: string;
  matched: boolean;
  courierName: string | null;
};

function parseType(s: string): DocumentType {
  const v = s.toLowerCase().trim();
  const found = (Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).find((t) => t === v || DOCUMENT_TYPE_LABEL[t].toLowerCase() === v);
  return found ?? "other";
}
function parseStatus(s: string): DocumentStatus {
  const v = s.toLowerCase();
  if (/aprob|approved|valid/.test(v)) return "approved";
  if (/respin|reject/.test(v)) return "rejected";
  return "in_review";
}

export function ImportDialog({
  open,
  onClose,
  couriers,
}: {
  open: boolean;
  onClose: () => void;
  couriers: Array<{ id: string; fullName: string; city: string; platforms: string[] }>;
}) {
  const { addDocument } = useDocuments();
  const { user, activeFleetId } = useSession();
  const toast = useToast();
  const [raw, setRaw] = useState("");

  const byId = useMemo(() => new Map(couriers.map((c) => [c.id, c])), [couriers]);

  const rows = useMemo<ParsedRow[]>(() => {
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^courier/i.test(l))
      .map((line) => {
        const [courierId = "", type = "", status = "", expiry = "", fileName = ""] = line.split(/[;,]/).map((s) => s.trim());
        const courier = byId.get(courierId);
        return {
          courierId, type: parseType(type), status: parseStatus(status),
          expiryIso: expiry || null, fileName: fileName || `${type || "document"}.pdf`,
          matched: !!courier, courierName: courier?.fullName ?? null,
        };
      });
  }, [raw, byId]);

  const matched = rows.filter((r) => r.matched);

  const confirm = () => {
    let n = 0;
    for (const r of matched) {
      const c = byId.get(r.courierId)!;
      addDocument({
        tenantId: activeFleetId, fleetId: activeFleetId,
        subject: { id: c.id, name: c.fullName, kind: "courier", city: c.city, platform: (c.platforms[0] as never) ?? null },
        type: r.type, status: r.status, expiryIso: r.expiryIso,
        file: { name: r.fileName, size: 0, type: "application/pdf", objectUrl: null },
        ocrEnabled: false, ocrProposed: null, verifiedManually: r.status === "approved", notes: "Import metadata",
        createdBy: user.name,
      }, user.name);
      n++;
    }
    toast.success("Import finalizat", `${n} documente (metadata) importate.`);
    setRaw("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Importă documente" description="Import metadata prin CSV. Asocierea se face DOAR după courier_id (sigur), cu preview înainte de confirmare." size="lg">
      <div className="mb-2 rounded-lg border border-line bg-card-2 p-2.5 text-[11.5px] text-fg-muted">
        Format linie: <code className="text-fg">courierId;tip;status;dataExpirarii;numeFisier</code>. Un rând per document. Import de fișiere binare în masă (ZIP) nu e suportat client-side — se folosește upload individual.
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={5}
        placeholder={`${couriers[0]?.id ?? "c_001"};id_card;approved;2030-05-01;ci_popescu.pdf`}
        className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 font-mono text-[12px] text-fg outline-none focus:border-accent/60"
      />

      {rows.length > 0 && (
        <div className="mt-3 max-h-[220px] overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-card"><tr className="text-left text-[10.5px] uppercase text-fg-dim">
              <th className="px-3 py-2">Curier</th><th className="py-2">Tip</th><th className="py-2">Status</th><th className="py-2">Expiră</th><th className="px-3 py-2 text-right">Match</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-3 py-1.5 text-fg">{r.courierName ?? <span className="text-fg-dim">{r.courierId || "—"}</span>}</td>
                  <td className="py-1.5 text-fg-muted">{DOCUMENT_TYPE_LABEL[r.type]}</td>
                  <td className="py-1.5 text-fg-muted">{r.status}</td>
                  <td className="py-1.5 text-fg-muted">{r.expiryIso ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    {r.matched ? <CheckCircle2 size={15} className="ml-auto text-[color:var(--color-success)]" /> : <AlertTriangle size={15} className="ml-auto text-[color:var(--color-warn)]" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Anulează</button>
        <button type="button" onClick={confirm} disabled={matched.length === 0} className={cn("inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", matched.length === 0 && "opacity-50")}>
          <FileUp size={14} /> Importă {matched.length} documente
        </button>
      </DialogFooter>
    </Dialog>
  );
}
