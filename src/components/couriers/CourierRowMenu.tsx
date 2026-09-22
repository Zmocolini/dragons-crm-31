"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, Archive, Ban, CircleCheck, FileEdit, FilePlus,
  MoreHorizontal, PencilLine, User, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

type Action =
  | "view"
  | "edit"
  | "upload_doc"
  | "record_payment"
  | "create_task"
  | "mark_issue"
  | "suspend"
  | "reactivate"
  | "archive";

type Props = {
  row: CourierRow;
  onAction: (action: Action, row: CourierRow) => void;
};

type MenuItem = {
  action: Action;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  divider?: boolean;
  requiresConfirm?: boolean;
};

const MENU_WIDTH = 208;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

export function CourierRowMenu({ row, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { can } = useSession();

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const compute = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.right - MENU_WIDTH;
      if (left + MENU_WIDTH > vw - VIEWPORT_MARGIN) left = vw - MENU_WIDTH - VIEWPORT_MARGIN;
      if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

      let top = rect.bottom + MENU_GAP;
      if (menuH > 0 && top + menuH > vh - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, rect.top - menuH - MENU_GAP);
      }

      setPos({ top, left });
    };
    compute();

    const onResize = () => compute();
    const onScroll = () => setOpen(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: MenuItem[] = [
    { action: "view", label: "Vezi profil", icon: User },
    ...(can("couriers.edit") ? [{ action: "edit" as Action, label: "Editează", icon: PencilLine }] : []),
    ...(can("documents.upload") ? [{ action: "upload_doc" as Action, label: "Încarcă document", icon: FilePlus }] : []),
    ...(can("payments.create") ? [{ action: "record_payment" as Action, label: "Înregistrează plată", icon: Wallet }] : []),
    { action: "create_task", label: "Creează task", icon: FileEdit, divider: true },
    { action: "mark_issue", label: "Marchează problemă", icon: AlertTriangle },
    ...(row.status === "active" || row.status === "in_activation"
      ? [{ action: "suspend" as Action, label: "Suspendă", icon: Ban, danger: true, requiresConfirm: true, divider: true }]
      : row.status === "paused" || row.status === "stopped"
        ? [{ action: "reactivate" as Action, label: "Reactivează", icon: CircleCheck, divider: true }]
        : []),
    ...(can("couriers.edit") ? [{ action: "archive" as Action, label: "Arhivează", icon: Archive, danger: true, requiresConfirm: true }] : []),
  ];

  const menu = open && mounted ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_WIDTH }}
      className="z-[1000] overflow-hidden rounded-lg border border-line bg-card-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={item.action + idx}>
            {item.divider && idx > 0 && <div className="my-1 border-t border-line/70" />}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (item.requiresConfirm) {
                  const label = item.action === "suspend" ? "suspendezi" : "arhivezi";
                  if (!window.confirm(`Sigur vrei să ${label} curierul ${row.fullName}? Acțiunea intră în Audit Log.`)) return;
                }
                onAction(item.action, row);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors",
                item.danger
                  ? "text-rose-300 hover:bg-rose-500/10"
                  : "text-fg-muted hover:bg-white/[0.04] hover:text-fg",
              )}
            >
              <Icon size={13} strokeWidth={2} />
              {item.label}
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acțiuni pentru ${row.fullName}`}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted",
          "transition-colors hover:bg-white/[0.06] hover:text-fg",
          open && "bg-white/[0.06] text-fg",
        )}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {menu}
    </>
  );
}

export type CourierRowAction = Action;
