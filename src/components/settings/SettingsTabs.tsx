"use client";

import { cn } from "@/lib/utils/cn";

export type SettingsTab =
  | "general"
  | "flota"
  | "integrari"
  | "utilizatori"
  | "notificari"
  | "securitate"
  | "facturare"
  | "personalizare";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "general",       label: "General" },
  { key: "flota",         label: "Flotă și operațiuni" },
  { key: "integrari",     label: "Integrări" },
  { key: "utilizatori",   label: "Utilizatori și acces" },
  { key: "notificari",    label: "Notificări" },
  { key: "securitate",    label: "Securitate" },
  { key: "facturare",     label: "Facturare" },
  { key: "personalizare", label: "Personalizare" },
];

export function SettingsTabs({
  active,
  onChange,
}: {
  active: SettingsTab;
  onChange: (t: SettingsTab) => void;
}) {
  return (
    <div className="border-b border-line">
      <div
        role="tablist"
        aria-label="Setări"
        className="-mb-px flex flex-wrap items-center gap-1 overflow-x-auto"
      >
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.key)}
              className={cn(
                "relative whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors",
                isActive ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-t bg-violet-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
