"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
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
  const { manageNav, isHidden, toggleHiddenHref, closeSidebar, navOrder, setNavOrder } = useUI();
  const [dragHref, setDragHref] = useState<string | null>(null);
  const [overHref, setOverHref] = useState<string | null>(null);
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

  // Ordinea salvată de utilizator; itemii fără poziție salvată rămân la coadă, în ordinea implicită.
  const rank = (href: string) => {
    const i = navOrder.indexOf(href);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const items = [...NAV_ITEMS]
    .sort((a, b) => rank(a.href) - rank(b.href))
    .filter((item) => can(item.permission))
    .filter((item) => manageNav ? true : isModuleActive(item.href))
    .filter((item) => manageNav ? true : !isHidden(item.href));

  // Mută `from` pe poziția lui `to` (în lista vizibilă) și salvează; itemii nevizibili rămân la coadă.
  const moveItem = (from: string, to: string) => {
    if (from === to) return;
    const order = items.map((i) => i.href);
    const fi = order.indexOf(from);
    const ti = order.indexOf(to);
    if (fi === -1 || ti === -1) return;
    order.splice(ti, 0, order.splice(fi, 1)[0]);
    setNavOrder([...order, ...NAV_ITEMS.map((i) => i.href).filter((h) => !order.includes(h))]);
  };
  const stepItem = (href: string, dir: -1 | 1) => {
    const order = items.map((i) => i.href);
    const t = order[order.indexOf(href) + dir];
    if (t) moveItem(href, t);
  };
  const dragProps = (href: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", href);
      setDragHref(href);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!dragHref) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overHref !== href) setOverHref(href);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragHref) moveItem(dragHref, href);
      setDragHref(null);
      setOverHref(null);
    },
    onDragEnd: () => {
      setDragHref(null);
      setOverHref(null);
    },
  });

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
            {item.badge && !manageNav && (
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
              {...dragProps(item.href)}
              className={cn(
                "group relative flex cursor-grab items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[13px] font-medium",
                dragHref === item.href && "opacity-40",
                overHref === item.href && dragHref !== item.href && "border-indigo-400 border-solid",
                hidden
                  ? "border-line/60 bg-card/40 text-fg-dim opacity-60"
                  : "border-violet-500/25 bg-violet-500/[0.04] text-fg-muted",
              )}
            >
              <GripVertical size={13} className="-ml-1.5 shrink-0 text-fg-dim" aria-hidden />
              {Row}
              <div className="flex shrink-0 flex-col gap-px">
                <button
                  type="button"
                  onClick={() => stepItem(item.href, -1)}
                  aria-label={`Mută ${item.label} în sus`}
                  className="inline-flex h-3.5 w-5 items-center justify-center rounded-sm border border-line text-fg-muted hover:bg-white/[0.06]"
                >
                  <ChevronUp size={10} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => stepItem(item.href, 1)}
                  aria-label={`Mută ${item.label} în jos`}
                  className="inline-flex h-3.5 w-5 items-center justify-center rounded-sm border border-line text-fg-muted hover:bg-white/[0.06]"
                >
                  <ChevronDown size={10} strokeWidth={3} />
                </button>
              </div>
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
            {...dragProps(item.href)}
            onClick={handleNavClick}
            data-density-row
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors max-lg:py-2.5 max-lg:text-[14.5px]",
              dragHref === item.href && "opacity-40",
              overHref === item.href && dragHref !== item.href && "ring-1 ring-indigo-400",
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
