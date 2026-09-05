"use client";

import {
  BarChart3, Calendar, Clock, Focus, Globe, LayoutDashboard,
  Lightbulb, Mail, Monitor, Palette, Sparkles, Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";
import { Switch } from "@/components/ui/Switch";
import type {
  DateFormat, Density, Language, ProfileData, Theme, TimeFormat,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils/cn";

type Draft = Pick<ProfileData,
  | "language" | "theme" | "timezone" | "dateFormat" | "timeFormat" | "density"
  | "reduceMotion" | "focusMode" | "showTips" | "alwaysDashboard"
>;

const TIMEZONES = [
  "Europe/Bucharest",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export function TabPreferences() {
  const { profile, updateProfile, logActivity } = useProfile();
  const toast = useToast();

  const buildDraft = (p: ProfileData): Draft => ({
    language: p.language,
    theme: p.theme,
    timezone: p.timezone,
    dateFormat: p.dateFormat,
    timeFormat: p.timeFormat,
    density: p.density,
    reduceMotion: p.reduceMotion,
    focusMode: p.focusMode,
    showTips: p.showTips,
    alwaysDashboard: p.alwaysDashboard,
  });

  const [draft, setDraft] = useState<Draft>(() => buildDraft(profile));

  useEffect(() => {
    setDraft(buildDraft(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.language, profile.theme, profile.timezone, profile.dateFormat, profile.timeFormat, profile.density, profile.reduceMotion, profile.focusMode, profile.showTips, profile.alwaysDashboard]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(buildDraft(profile));

  function reset() {
    setDraft(buildDraft(profile));
  }

  function save() {
    updateProfile(draft);
    logActivity("preferences.update", "Preferințe personale actualizate");
    toast.success("Preferințele au fost salvate.", "Setările tale se aplică în toată aplicația.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Preferințe personale</h3>
            <p className="text-[11.5px] text-fg-muted">
              Configurează modul în care vrei să folosești aplicația.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-card-hover hover:text-fg"
              >
                Anulează
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors",
                dirty ? "bg-violet-600 hover:bg-violet-500" : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
              )}
            >
              Salvează modificările
            </button>
          </div>
        </header>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          <SelectCard
            icon={Globe}
            label="Limbă"
            description="Alege limba interfeței aplicației."
            value={draft.language}
            options={[
              { value: "ro", label: "🇷🇴 Română" },
              { value: "en", label: "🇬🇧 English" },
            ]}
            onChange={(v) => setDraft({ ...draft, language: v as Language })}
          />
          <SelectCard
            icon={Palette}
            label="Temă"
            description="Alege tema aplicației."
            value={draft.theme}
            options={[
              { value: "dark",   label: "Dark (implicit)" },
              { value: "light",  label: "Light" },
              { value: "system", label: "System" },
            ]}
            onChange={(v) => setDraft({ ...draft, theme: v as Theme })}
          />
          <SelectCard
            icon={Clock}
            label="Fus orar"
            description="Setează fusul orar pentru rapoarte."
            value={draft.timezone}
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
            onChange={(v) => setDraft({ ...draft, timezone: v })}
          />
          <SelectCard
            icon={Calendar}
            label="Format dată"
            description="Alege formatul pentru dată."
            value={draft.dateFormat}
            options={[
              { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
              { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
              { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
            ]}
            onChange={(v) => setDraft({ ...draft, dateFormat: v as DateFormat })}
          />
          <SelectCard
            icon={Clock}
            label="Format oră"
            description="Alege formatul pentru oră."
            value={draft.timeFormat}
            options={[
              { value: "24h", label: "24h" },
              { value: "12h", label: "12h" },
            ]}
            onChange={(v) => setDraft({ ...draft, timeFormat: v as TimeFormat })}
          />
          <SelectCard
            icon={Monitor}
            label="Densitate interfață"
            description="Personalizează spațiul din interfață."
            value={draft.density}
            options={[
              { value: "compact",     label: "Compactă" },
              { value: "comfortable", label: "Confortabilă" },
              { value: "aerisit",     label: "Aerisită" },
            ]}
            onChange={(v) => setDraft({ ...draft, density: v as Density })}
          />
        </div>

        <div className="border-t border-line/60 p-5">
          <h4 className="text-[13px] font-semibold text-fg">Alte preferințe</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ToggleCard
              icon={Sun}
              label="Redă animații"
              description="Activează animațiile din interfață."
              checked={!draft.reduceMotion}
              onChange={(v) => setDraft({ ...draft, reduceMotion: !v })}
            />
            <ToggleCard
              icon={Focus}
              label="Mod focus"
              description="Ascunde elementele neesențiale."
              checked={draft.focusMode}
              onChange={(v) => setDraft({ ...draft, focusMode: v })}
            />
            <ToggleCard
              icon={Lightbulb}
              label="Sugestii și sfaturi"
              description="Afișează sugestii utile în aplicație."
              checked={draft.showTips}
              onChange={(v) => setDraft({ ...draft, showTips: v })}
            />
            <ToggleCard
              icon={LayoutDashboard}
              label="Dashboard implicit"
              description="Deschide direct dashboard-ul la autentificare."
              checked={draft.alwaysDashboard}
              onChange={(v) => setDraft({ ...draft, alwaysDashboard: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function SelectCard({
  icon: Icon,
  label,
  description,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted">
          <Icon size={15} />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[13px] font-semibold text-fg">{label}</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">{description}</div>
        </div>
      </div>
      <div className="relative shrink-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 max-w-[220px] appearance-none rounded-lg border border-line bg-card px-3 pr-8 text-[12.5px] font-medium text-fg focus:border-violet-500/50 focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-dim"
          viewBox="0 0 12 12"
        >
          <path fill="currentColor" d="M6 8L2 4h8z" />
        </svg>
      </div>
    </div>
  );
}

function ToggleCard({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted">
          <Icon size={15} />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[13px] font-semibold text-fg">{label}</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}
