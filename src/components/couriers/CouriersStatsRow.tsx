"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Users } from "lucide-react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { cn } from "@/lib/utils/cn";
import type { QuickFilterKey } from "@/lib/couriers/filters";
import type { PlatformKey } from "@/lib/dashboard/types";

type Tile =
  | { kind: "icon"; key: QuickFilterKey; value: number; label: string; icon: LucideIcon; tone: "success" | "info" | "warn" | "danger" }
  | { kind: "platform"; key: QuickFilterKey; value: number; label: string; platform: PlatformKey };

type Props = {
  active: number;
  bolt: number;
  wolt: number;
  glovo: number;
  openIssues: number;
  activeFilter: QuickFilterKey;
  onSelect: (key: QuickFilterKey) => void;
};

export function CouriersStatsRow({
  active, bolt, wolt, glovo, openIssues,
  activeFilter, onSelect,
}: Props) {
  const tiles: Tile[] = [
    { kind: "icon",     key: "status_active",   value: active,     label: "Curieri activi",    icon: Users,         tone: "success" },
    { kind: "platform", key: "platform_bolt",   value: bolt,       label: "Bolt Food",         platform: "bolt" },
    { kind: "platform", key: "platform_wolt",   value: wolt,       label: "Wolt",              platform: "wolt" },
    { kind: "platform", key: "platform_glovo",  value: glovo,      label: "Glovo",             platform: "glovo" },
    { kind: "icon",     key: "open_issues",     value: openIssues, label: "Probleme deschise", icon: AlertTriangle, tone: "danger"  },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {tiles.map((tile) => {
        const isActive = activeFilter === tile.key;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onSelect(isActive ? "all" : tile.key)}
            aria-pressed={isActive}
            className={cn(
              "group flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
              "border-line bg-card hover:bg-card-hover",
              isActive && "border-indigo-400/60 bg-indigo-500/[0.06] ring-1 ring-indigo-400/40",
            )}
          >
            {tile.kind === "platform" ? (
              <PlatformLogo platform={tile.platform} size={48} rounded="lg" />
            ) : (
              <IconTile icon={tile.icon} tone={tile.tone} />
            )}
            <div className="min-w-0">
              <div className="text-[28px] font-bold leading-none tracking-tight text-fg">
                {tile.value}
              </div>
              <div className="mt-1.5 text-[12.5px] font-medium text-fg-muted">
                {tile.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone: "success" | "info" | "warn" | "danger" }) {
  const cls =
    tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
    tone === "info"    ? "border-sky-500/30 bg-sky-500/10 text-sky-300" :
    tone === "warn"    ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
    "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", cls)}>
      <Icon size={22} strokeWidth={2} />
    </span>
  );
}
