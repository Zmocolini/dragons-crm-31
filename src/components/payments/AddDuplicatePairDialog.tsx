"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useCouriers } from "@/lib/couriers/context";
import { useSession } from "@/lib/rbac/session";
import { useDuplicatePairs, type PairOptions } from "@/lib/subcontractors/duplicate-pairs-context";
import { cn } from "@/lib/utils/cn";

/** Dialog pentru adăugarea unei perechi de cont dublu: alegi 2 curieri din CRM + opțiuni unificare. */
export function AddDuplicatePairDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allRows } = useCouriers();
  const { activeFleetId } = useSession();
  const { addPair, pairs } = useDuplicatePairs();

  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [feeStr, setFeeStr] = useState<string>("");            // taxă RON, o singură dată
  const [commissionStr, setCommissionStr] = useState<string>(""); // procent comision, o singură dată
  const [error, setError] = useState<string | null>(null);

  const fleetCouriers = useMemo(
    () => allRows.filter((c) => c.tenantId === activeFleetId).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [allRows, activeFleetId],
  );

  const alreadyPaired = new Set<string>(pairs.flatMap((p) => [p.aId, p.bId]));

  const handleClose = () => {
    setAId(""); setBId(""); setFeeStr(""); setCommissionStr(""); setError(null);
    onClose();
  };

  const parseNum = (s: string): number | null => {
    const t = s.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const handleSubmit = () => {
    if (!aId || !bId) { setError("Alege ambii curieri."); return; }
    if (aId === bId)  { setError("Alege 2 curieri diferiți."); return; }
    const feeOnce = parseNum(feeStr);
    const commissionPct = parseNum(commissionStr);
    if (feeStr.trim() && feeOnce === null) { setError("Taxa e invalidă (ex: 350)."); return; }
    if (commissionStr.trim() && commissionPct === null) { setError("Comisionul e invalid (ex: 10)."); return; }
    const opts: PairOptions = { feeOnce, commissionPct };
    addPair(aId, bId, opts);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Adaugă pereche cont dublu" size="md">
      <div className="flex flex-col gap-4">
        <div className="text-[12px] text-fg-muted">
          Alege 2 curieri din CRM care aparțin aceleiași persoane. La plăți vor primi badge <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1 text-cyan-200">2×</span> și le poți combina într-un singur rând.
        </div>

        <CourierPicker label="Curier A" value={aId} onChange={setAId} options={fleetCouriers} disabledIds={alreadyPaired} excludeId={bId} />
        <CourierPicker label="Curier B" value={bId} onChange={setBId} options={fleetCouriers} disabledIds={alreadyPaired} excludeId={aId} />

        <div className="rounded-lg border border-line bg-card-hover p-3">
          <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-fg-dim">Aplicare o singură dată pe pereche</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[11.5px] text-fg-muted">
              <span>Taxă săptămânală (RON)</span>
              <div className="flex items-center gap-1">
                <input
                  type="text" inputMode="decimal" placeholder="ex: 350"
                  value={feeStr}
                  onChange={(e) => setFeeStr(e.target.value)}
                  className="h-8 w-full rounded-md border border-line bg-card-2 px-2 text-right text-[13px] font-mono text-fg focus:border-violet-500/60 focus:outline-none"
                />
                <span className="text-[11px] text-fg-dim">RON</span>
              </div>
              <span className="text-[10px] text-fg-dim">Gol = fiecare cont plătește taxa lui</span>
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-fg-muted">
              <span>Comision (%)</span>
              <div className="flex items-center gap-1">
                <input
                  type="text" inputMode="decimal" placeholder="ex: 10"
                  value={commissionStr}
                  onChange={(e) => setCommissionStr(e.target.value)}
                  className="h-8 w-full rounded-md border border-line bg-card-2 px-2 text-right text-[13px] font-mono text-fg focus:border-violet-500/60 focus:outline-none"
                />
                <span className="text-[11px] text-fg-dim">%</span>
              </div>
              <span className="text-[10px] text-fg-dim">Gol = fiecare cont plătește comisionul lui</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-[12px] text-rose-200">{error}</div>
        )}
      </div>

      <DialogFooter>
        <button type="button" onClick={handleClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          Anulează
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!aId || !bId || aId === bId}
          className={cn(
            "rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white",
            (!aId || !bId || aId === bId) && "opacity-40",
          )}
        >
          Adaugă pereche
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function CourierPicker({
  label, value, onChange, options, disabledIds, excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: Array<{ id: string; fullName: string; city?: string | null }>;
  disabledIds: Set<string>;
  excludeId: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((c) => c.id !== excludeId)
      .filter((c) => !q || c.fullName.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, query, excludeId]);

  const selected = options.find((c) => c.id === value);

  return (
    <div>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-fg-dim">{label}</div>
      <input
        type="text"
        value={selected ? selected.fullName : query}
        onChange={(e) => { setQuery(e.target.value); if (value) onChange(""); }}
        placeholder="Caută curier după nume…"
        className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
      />
      {!selected && query && (
        <div className="mt-1 max-h-[180px] overflow-y-auto rounded-md border border-line bg-card">
          {filtered.length === 0 ? (
            <div className="px-2 py-2 text-[11.5px] text-fg-muted">Fără rezultate</div>
          ) : (
            filtered.map((c) => {
              const isDisabled = disabledIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { onChange(c.id); setQuery(""); }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-violet-500/10 hover:text-violet-100",
                    isDisabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span className="truncate">{c.fullName}</span>
                  {isDisabled && <span className="text-[10px] text-fg-dim">deja perechizit</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
