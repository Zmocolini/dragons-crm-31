"use client";

import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import type {
  DateFormat,
  Density,
  Language,
  Theme,
  TimeFormat,
} from "@/lib/profile/types";

export function TabPreferences() {
  const { profile, updateProfile, logActivity } = useProfile();
  const toast = useToast();

  function change<K extends keyof typeof profile>(key: K, value: (typeof profile)[K], label: string) {
    updateProfile({ [key]: value } as Partial<typeof profile>);
    logActivity("preferences.update", label);
    toast.success("Preferință salvată", label);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-[15px] font-semibold text-fg">Preferințe personale</h3>
        <p className="text-[11.5px] text-fg-muted">
          Aceste setări afectează doar contul tău, nu setările flotei.
        </p>

        <div className="mt-5 space-y-6">
          <Group label="Limbă" description="Limba interfeței și a notificărilor.">
            <SegmentedControl
              options={[
                { value: "ro", label: "Română" },
                { value: "en", label: "English" },
              ]}
              value={profile.language}
              onChange={(v) => change("language", v as Language, `Limbă: ${v}`)}
            />
          </Group>

          <Group label="Temă" description="Mod de afișare al interfeței.">
            <SegmentedControl
              options={[
                { value: "dark",   label: "Dark" },
                { value: "light",  label: "Light" },
                { value: "system", label: "System" },
              ]}
              value={profile.theme}
              onChange={(v) => change("theme", v as Theme, `Temă: ${v}`)}
            />
          </Group>

          <Group label="Fus orar" description="Timpurile din CRM sunt afișate în acest fus.">
            <select
              value={profile.timezone}
              onChange={(e) => change("timezone", e.target.value, `Timezone: ${e.target.value}`)}
              className="h-10 w-full max-w-xs rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
            >
              {[
                "Europe/Bucharest",
                "Europe/London",
                "Europe/Paris",
                "Europe/Berlin",
                "Europe/Madrid",
                "America/New_York",
                "America/Los_Angeles",
                "UTC",
              ].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Group>

          <Group label="Format dată">
            <SegmentedControl
              options={[
                { value: "DD.MM.YYYY", label: "31.12.2026" },
                { value: "YYYY-MM-DD", label: "2026-12-31" },
                { value: "MM/DD/YYYY", label: "12/31/2026" },
              ]}
              value={profile.dateFormat}
              onChange={(v) => change("dateFormat", v as DateFormat, `Format dată: ${v}`)}
            />
          </Group>

          <Group label="Format oră">
            <SegmentedControl
              options={[
                { value: "24h", label: "14:30" },
                { value: "12h", label: "2:30 PM" },
              ]}
              value={profile.timeFormat}
              onChange={(v) => change("timeFormat", v as TimeFormat, `Format oră: ${v}`)}
            />
          </Group>

          <Group label="Densitate interfață" description="Cât de compacte sunt cardurile și tabelele.">
            <SegmentedControl
              options={[
                { value: "compact",     label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
              value={profile.density}
              onChange={(v) => change("density", v as Density, `Densitate: ${v}`)}
            />
          </Group>
        </div>
      </section>
    </div>
  );
}

function Group({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-start">
      <div>
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        {description && (
          <p className="mt-0.5 text-[11.5px] text-fg-muted">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-card-2/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
            o.value === value
              ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/40"
              : "text-fg-muted hover:bg-white/[0.04] hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
