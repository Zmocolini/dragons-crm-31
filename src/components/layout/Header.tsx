"use client";

import { Bell, ChevronDown, Menu, Search, Sun } from "lucide-react";
import { useSession } from "@/lib/rbac/session";
import { ROLE_LABELS } from "@/lib/rbac/roles";

function detectModKey(): "⌘" | "Ctrl" {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl";
}

export function Header() {
  const { user } = useSession();
  const modKey = detectModKey();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-app/85 px-5 backdrop-blur"
    >
      <button
        type="button"
        aria-label="Deschide meniul"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
      >
        <Menu size={20} />
      </button>

      <div className="relative flex max-w-2xl flex-1 items-center">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 text-fg-dim"
        />
        <input
          type="search"
          placeholder="Caută curier, telefon, oraș, document..."
          className="h-10 w-full rounded-lg border border-line bg-card pl-10 pr-16 text-[13px] text-fg placeholder:text-fg-dim focus:border-white/15 focus:outline-none focus:ring-0"
          aria-label="Caută în CRM"
        />
        <span className="pointer-events-none absolute right-3 flex items-center gap-1">
          <kbd className="rounded-md border border-line bg-app px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
            {modKey}
          </kbd>
          <kbd className="rounded-md border border-line bg-app px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
            K
          </kbd>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Schimbă tema"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          <Sun size={17} />
        </button>

        <button
          type="button"
          aria-label="8 notificări noi"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          <Bell size={17} />
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-app">
            8
          </span>
        </button>

        <button
          type="button"
          className="ml-2 flex items-center gap-2.5 rounded-xl border border-line bg-card px-2 py-1.5 text-left transition-colors hover:bg-card-hover"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
            {initials}
          </span>
          <span className="leading-tight">
            <span className="block text-[12.5px] font-semibold text-fg">
              {user.name}
            </span>
            <span className="block text-[10.5px] text-fg-dim">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronDown size={14} className="text-fg-dim" />
        </button>
      </div>
    </header>
  );
}
