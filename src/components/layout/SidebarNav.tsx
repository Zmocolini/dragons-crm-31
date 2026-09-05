"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav/nav-items";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

export function SidebarNav() {
  const pathname = usePathname();
  const { can } = useSession();

  return (
    <nav aria-label="Navigare principală" className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.filter((item) => can(item.permission)).map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent text-fg"
                : "text-fg-muted hover:bg-white/[0.03] hover:text-fg",
            )}
          >
            {isActive && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-indigo-400" />
            )}
            <Icon
              size={17}
              strokeWidth={2}
              className={cn(
                "shrink-0",
                isActive ? "text-indigo-300" : "text-fg-dim group-hover:text-fg-muted",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-violet-300">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
