"use client";

import Link from "next/link";
import { ChevronDown, Building2, LogOut, Settings, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { useSession } from "@/lib/rbac/session";
import { useProfile } from "@/lib/profile/context";
import { FleetSwitcherDialog } from "./FleetSwitcherDialog";
import { cn } from "@/lib/utils/cn";

type OpenDialog = null | "tenant" | "logout";

export function UserMenu() {
  const { user } = useSession();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = profile.displayName ?? user.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Meniu utilizator"
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-line bg-card px-2 py-1.5 text-left transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
          open && "bg-card-hover",
        )}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="leading-tight">
          <span className="block text-[12.5px] font-semibold text-fg">{displayName}</span>
          <span className="block text-[10.5px] text-fg-dim">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown
          size={14}
          className={cn("text-fg-dim transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Meniu utilizator"
          className="absolute right-0 top-full z-40 mt-2 w-[300px] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/50"
        >
          {/* Header — user info */}
          <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3.5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[13px] font-bold text-white ring-1 ring-white/10">
              {initials}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[13.5px] font-semibold text-fg">{displayName}</div>
              <div className="text-[11.5px] text-fg-muted">{ROLE_LABELS[user.role]}</div>
              <div className="mt-0.5 truncate text-[11px] text-fg-dim">{user.email}</div>
            </div>
          </div>

          {/* Items */}
          <div className="py-1.5">
            <MenuItem
              href="/profil"
              icon={<User size={16} />}
              iconTone="text-fg-muted"
              title="Profilul meu"
              subtitle="Vezi și editează informațiile tale"
              onClick={closeMenu}
            />
            <MenuItem
              href="/setari"
              icon={<Settings size={16} />}
              iconTone="text-fg-muted"
              title="Setări"
              subtitle="Preferințe cont și notificări"
              onClick={closeMenu}
            />
            <MenuItem
              icon={<Building2 size={16} />}
              iconTone="text-amber-300"
              title="Schimbă flota"
              subtitle={`Activă: ${user.activeTenant.name}`}
              onClick={() => {
                closeMenu();
                // scurt delay ca dropdown-ul să dispară înainte de dialog (evită „artefacte")
                setTimeout(() => setDialog("tenant"), 50);
              }}
            />

            <div className="mx-3 my-1.5 h-px bg-line/60" />

            <MenuItem
              icon={<LogOut size={16} />}
              iconTone="text-rose-400"
              title="Logout"
              subtitle="Ieși din cont"
              danger
              onClick={() => {
                closeMenu();
                setTimeout(() => setDialog("logout"), 50);
              }}
            />
          </div>
        </div>
      )}

      {/* Fleet switcher — folosim același dialog cu sidebar & Setări */}
      <FleetSwitcherDialog
        open={dialog === "tenant"}
        onClose={() => setDialog(null)}
      />

      {dialog === "logout" && <LogoutDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  iconTone,
  title,
  subtitle,
  danger,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/60 bg-card-2/60",
          iconTone,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span
          className={cn(
            "block text-[13.5px] font-semibold",
            danger ? "text-rose-300" : "text-fg",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-fg-dim">{subtitle}</span>
      </span>
    </>
  );

  const cls = cn(
    "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
    danger ? "hover:bg-rose-500/[0.08]" : "hover:bg-white/[0.03]",
  );

  if (href) {
    return (
      <Link href={href} role="menuitem" onClick={onClick} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function LogoutDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // TODO(real-users): apelează signOut() Better-Auth + router.push('/login').
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Închide"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
        >
          <X size={16} />
        </button>
        <h2 className="text-[16px] font-bold text-fg">Deconectare</h2>
        <p className="mt-3 text-[13px] text-fg-muted">
          Sigur vrei să te deconectezi din cont?
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-card-hover"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/90 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-rose-500"
          >
            <LogOut size={13} />
            Deconectează-mă
          </button>
        </div>
      </div>
    </div>
  );
}
