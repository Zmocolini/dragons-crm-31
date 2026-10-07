"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import type { AdvancedFilters } from "@/lib/couriers/filters";
import { DEFAULT_ADVANCED_FILTERS } from "@/lib/couriers/filters";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { CourierStatus, VehicleType } from "@/lib/couriers/types";
import { COURIER_STATUS_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";
import type { DocumentsState } from "@/lib/couriers/mock-seed";

type Props = {
  open: boolean;
  onClose: () => void;
  current: AdvancedFilters;
  cities: string[];
  subcontractors: string[];
  onApply: (f: AdvancedFilters) => void;
};

const PLATFORM_LABEL: Record<PlatformKey, string> = {
  bolt: "Bolt Food", wolt: "Wolt", glovo: "Glovo",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-dim">{label}</span>
      {children}
    </label>
  );
}

const inputCls = cn(
  "rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg",
  "focus:border-indigo-400/60 focus:outline-none",
);

export function AdvancedFiltersDialog({ open, onClose, current, cities, subcontractors, onApply }: Props) {
  const [draft, setDraft] = useState<AdvancedFilters>(current);

  const update = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} title="Filtre avansate" description="Combină criterii pentru a găsi curieri specifici. Se aplică pe lista curentă." size="lg">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status">
          <select className={inputCls} value={draft.status} onChange={(e) => update("status", e.target.value as AdvancedFilters["status"])}>
            <option value="any">Oricare</option>
            {(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[]).map((s) => (
              <option key={s} value={s}>{COURIER_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Oraș">
          <select className={inputCls} value={draft.city} onChange={(e) => update("city", e.target.value)}>
            <option value="any">Toate orașele</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Platformă">
          <select className={inputCls} value={draft.platform} onChange={(e) => update("platform", e.target.value as AdvancedFilters["platform"])}>
            <option value="any">Oricare</option>
            {(["bolt", "wolt", "glovo"] as PlatformKey[]).map((p) => (
              <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
            ))}
          </select>
        </Field>
        <Field label="Vehicul">
          <select className={inputCls} value={draft.vehicle} onChange={(e) => update("vehicle", e.target.value as AdvancedFilters["vehicle"])}>
            <option value="any">Oricare</option>
            {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => (
              <option key={v} value={v}>{VEHICLE_TYPE_LABEL[v]}</option>
            ))}
          </select>
        </Field>
        <Field label="Documente">
          <select className={inputCls} value={draft.documents} onChange={(e) => update("documents", e.target.value as DocumentsState | "any")}>
            <option value="any">Oricare</option>
            <option value="complete">Complet</option>
            <option value="missing">Lipsă</option>
            <option value="expired">Expirat</option>
          </select>
        </Field>
        <Field label="Activări">
          <select className={inputCls} value={draft.activation} onChange={(e) => update("activation", e.target.value as AdvancedFilters["activation"])}>
            <option value="any">Oricare</option>
            <option value="in_progress">În activare</option>
            <option value="blocked">Activare blocată</option>
            <option value="completed">Activare finalizată</option>
          </select>
        </Field>
        {subcontractors.length > 0 && <Field label="Subcontractor">
          <select className={inputCls} value={draft.subcontractor} onChange={(e) => update("subcontractor", e.target.value)}>
            <option value="any">Oricare</option>
            <option value="__none__">Fără subcontractor</option>
            {subcontractors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>}
        <Field label="Perioadă adăugare">
          <select className={inputCls} value={draft.addedRange} onChange={(e) => update("addedRange", e.target.value as AdvancedFilters["addedRange"])}>
            <option value="any">Oricare</option>
            <option value="7d">Ultimele 7 zile</option>
            <option value="30d">Ultimele 30 zile</option>
            <option value="90d">Ultimele 90 zile</option>
          </select>
        </Field>
        <Field label="Are probleme deschise">
          <select className={inputCls} value={draft.hasIssue} onChange={(e) => update("hasIssue", e.target.value as AdvancedFilters["hasIssue"])}>
            <option value="any">Indiferent</option>
            <option value="yes">Da</option>
            <option value="no">Nu</option>
          </select>
        </Field>
        <Field label="Are plată în așteptare">
          <select className={inputCls} value={draft.hasPendingPayment} onChange={(e) => update("hasPendingPayment", e.target.value as AdvancedFilters["hasPendingPayment"])}>
            <option value="any">Indiferent</option>
            <option value="yes">Da</option>
            <option value="no">Nu</option>
          </select>
        </Field>
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={() => { setDraft(DEFAULT_ADVANCED_FILTERS); onApply(DEFAULT_ADVANCED_FILTERS); onClose(); }}
          className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Resetează
        </button>
        <button
          type="button"
          onClick={() => { onApply(draft); onClose(); }}
          className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-lg shadow-indigo-900/30"
        >
          Aplică filtrele
        </button>
      </DialogFooter>
    </Dialog>
  );
}
