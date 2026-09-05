"use client";

import { Activity, Bell, ShieldCheck, Sliders, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ProfileTab =
  | "personal"
  | "preferences"
  | "security"
  | "notifications"
  | "activity";

const TABS: { key: ProfileTab; label: string; icon: LucideIcon }[] = [
  { key: "personal",      label: "Informații personale", icon: User },
  { key: "preferences",   label: "Preferințe",           icon: Sliders },
  { key: "security",      label: "Securitate",           icon: ShieldCheck },
  { key: "notifications", label: "Notificări",           icon: Bell },
  { key: "activity",      label: "Activitate cont",      icon: Activity },
];

export function ProfileTabs({
  active,
  onChange,
}: {
  active: ProfileTab;
  onChange: (t: ProfileTab) => void;
}) {
  return (
    <div className="border-b border-line">
      <div
        role="tablist"
        aria-label="Secțiuni profil"
        className="-mb-px flex flex-wrap items-center gap-1 overflow-x-auto"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.key)}
              className={cn(
                "relative inline-flex items-center gap-2 px-3.5 py-3 text-[13px] font-medium transition-colors",
                isActive
                  ? "text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon size={14} />
              {t.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-violet-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
