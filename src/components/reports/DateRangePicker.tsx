"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Popover } from "./controls";
import { cn } from "@/lib/utils/cn";

const RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sept", "Oct", "Noi", "Dec"];

export function formatPeriodButton(fromIso: string, toIso: string): string {
  const a = new Date(fromIso + "T00:00:00Z");
  const b = new Date(toIso + "T00:00:00Z");
  const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")} ${RO_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${fmt(a)} - ${fmt(b)}`;
}

const DAY_MS = 86400000;
const TODAY_ISO = "2026-09-10"; // „azi" în domeniul mock

function addDays(iso: string, n: number): string {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + n * DAY_MS).toISOString().slice(0, 10);
}
function monthStart(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

type Preset = { key: string; label: string; range: () => [string, string] };
const PRESETS: Preset[] = [
  { key: "d1", label: "Azi", range: () => [TODAY_ISO, TODAY_ISO] },
  { key: "d7", label: "Ultimele 7 zile", range: () => [addDays(TODAY_ISO, -6), TODAY_ISO] },
  { key: "w", label: "Săptămâna referință (01–07 Sep)", range: () => ["2026-09-01", "2026-09-07"] },
  { key: "d30", label: "Ultimele 30 zile", range: () => [addDays(TODAY_ISO, -29), TODAY_ISO] },
  { key: "m", label: "Luna curentă", range: () => [monthStart(TODAY_ISO), TODAY_ISO] },
];

export function DateRangePicker({
  fromIso,
  toIso,
  onApply,
  compact,
}: {
  fromIso: string;
  toIso: string;
  onApply: (fromIso: string, toIso: string) => void;
  compact?: boolean;
}) {
  return (
    <Popover
      align="right"
      className="w-[320px] p-3"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]",
            open && "border-accent/60",
            compact && "w-full justify-between",
          )}
        >
          <CalendarDays size={14} className="text-fg-dim" />
          <span className="tabular-nums">{formatPeriodButton(fromIso, toIso)}</span>
        </button>
      )}
    >
      {(close) => <RangeEditor fromIso={fromIso} toIso={toIso} onApply={onApply} close={close} />}
    </Popover>
  );
}

function RangeEditor({
  fromIso,
  toIso,
  onApply,
  close,
}: {
  fromIso: string;
  toIso: string;
  onApply: (fromIso: string, toIso: string) => void;
  close: () => void;
}) {
  const [from, setFrom] = useState(fromIso);
  const [to, setTo] = useState(toIso);
  const invalid = from > to;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-semibold text-fg">Perioadă rapidă</div>
      <div className="flex flex-col gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              const [f, t] = p.range();
              onApply(f, t);
              close();
            }}
            className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg-muted hover:bg-white/[0.05] hover:text-fg"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="border-t border-line pt-3">
        <div className="mb-2 text-[12px] font-semibold text-fg">Interval custom</div>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[10.5px] uppercase tracking-wide text-fg-dim">Început</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-line bg-card-hover px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[10.5px] uppercase tracking-wide text-fg-dim">Sfârșit</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-line bg-card-hover px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]"
            />
          </label>
        </div>
        {invalid && <p className="mt-1.5 text-[11px] text-[color:var(--color-danger)]">Data de început trebuie să fie ≤ data de sfârșit.</p>}
        <button
          type="button"
          disabled={invalid}
          onClick={() => {
            onApply(from, to);
            close();
          }}
          className={cn(
            "mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white",
            invalid && "cursor-not-allowed opacity-50",
          )}
        >
          Aplică intervalul
        </button>
      </div>
    </div>
  );
}
