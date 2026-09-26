"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav/nav-items";
import { useNavAlerts } from "@/lib/nav/use-nav-alerts";
import { useSession } from "@/lib/rbac/session";
import { useUI } from "@/lib/ui/ui-context";
import { useSettings } from "@/lib/settings/context";
import { MODULE_FOR_HREF } from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

export function SidebarNav() {
  const pathname = usePathname();
  const { can } = useSession();
  const { manageNav, isHidden, toggleHiddenHref, closeSidebar } = useUI();
  const { isModuleEnabled } = useSettings();
  const alertHrefs = useNavAlerts();

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  // Filtru modul dezactivat din Setări → Flotă și operațiuni
  const isModuleActive = (href: string) => {
    const mod = MODULE_FOR_HREF[href];
    if (!mod) return true;
    return isModuleEnabled(mod);
  };

  // Dashboard = agregat: are alert dacă orice alt item are alert real.
  const anyOtherAlert = alertHrefs.size > 0;

  const items = NAV_ITEMS
    .filter((item) => can(item.permission))
    .filter((item) => manageNav ? true : isModuleActive(item.href))
    .filter((item) => manageNav ? true : !isHidden(item.href));

  return (
    <nav aria-label="Navigare principală" className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const hidden = isHidden(item.href);
        const hasAlert = item.href === "/" ? anyOtherAlert : alertHrefs.has(item.href);

        const Row = (
          <>
            {isActive && !manageNav && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-indigo-400" />
            )}
            <Icon
              size={17}
              strokeWidth={2}
              className={cn(
                "shrink-0",
                isActive && !manageNav
                  ? "text-indigo-300"
                  : "text-fg-dim group-hover:text-fg-muted",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span
                data-non-essential
                className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-violet-300"
              >
                {item.badge}
              </span>
            )}
            {hasAlert && !manageNav && (
              <span
                aria-label="Acțiuni în așteptare"
                className="relative flex h-2 w-2 shrink-0"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-panel" />
              </span>
            )}
          </>
        );

        if (manageNav) {
          return (
            <div
              key={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-[13px] font-medium",
                hidden
                  ? "border-line/60 bg-card/40 text-fg-dim opacity-60"
                  : "border-violet-500/25 bg-violet-500/[0.04] text-fg-muted",
              )}
            >
              {Row}
              <button
                type="button"
                onClick={() => toggleHiddenHref(item.href)}
                aria-label={hidden ? `Arată ${item.label}` : `Ascunde ${item.label}`}
                title={hidden ? "Arată" : "Ascunde"}
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  hidden
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
                )}
              >
                <X size={10} strokeWidth={3} className={hidden ? "rotate-45" : ""} />
              </button>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            data-density-row
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors max-lg:py-2.5 max-lg:text-[14.5px]",
              isActive
                ? "bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent text-fg"
                : "text-fg-muted hover:bg-white/[0.03] hover:text-fg",
            )}
          >
            {Row}
          </Link>
        );
      })}
    </nav>
  );
}
