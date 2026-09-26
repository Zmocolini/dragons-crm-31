"use client";

import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CLOSE_DRAG_PX = 120;

/** Pe telefon (fereastră pe tot ecranul): tras în jos din vârful conținutului → închide. */
function useSwipeDownToClose(onClose: () => void) {
  const start = useRef<{ y: number; t: number } | null>(null);
  const dy = useRef(0);
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const shell = e.currentTarget;
    const target = e.target as Element;
    if (window.innerWidth >= 640 || shell.scrollTop > 0 || e.touches.length !== 1) { start.current = null; return; }
    if (target.closest("input, textarea, select, [contenteditable='true']")) { start.current = null; return; }
    start.current = { y: e.touches[0].clientY, t: performance.now() };
    dy.current = 0;
  };
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const d = e.touches[0].clientY - start.current.y;
    if (d <= 0 || e.currentTarget.scrollTop > 0) { dy.current = 0; e.currentTarget.style.translate = ""; return; }
    dy.current = d;
    e.currentTarget.style.transition = "none";
    e.currentTarget.style.translate = `0 ${d * 0.8}px`;
  };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const el = e.currentTarget;
    const v = dy.current / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    el.style.transition = "translate 180ms ease-out";
    if (dy.current > CLOSE_DRAG_PX || (v > 0.6 && dy.current > 40)) {
      el.style.translate = "0 100dvh";
      setTimeout(onClose, 160);
    } else {
      el.style.translate = "";
    }
  };
  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd };
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const swipe = useSwipeDownToClose(onClose);

  if (!open || typeof document === "undefined") return null;

  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  // Portal la document.body ca dialog-ul să scape din stacking contexts
  // create de parents cu backdrop-blur / transform / filter (ex: Header sticky).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        data-modal-shell
        className={cn(
          "relative w-full max-h-[92dvh] overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-2xl sm:p-6",
          width,
        )}
        onClick={(e) => e.stopPropagation()}
        {...swipe}
      >
        {/* Mâner vizual pe telefon: fereastra se poate închide trăgând în jos. */}
        <div aria-hidden className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <button
          type="button"
          aria-label="Închide"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
        >
          <X size={16} />
        </button>
        <div className="pr-8">
          <h2 id="dialog-title" className="text-[16px] font-bold text-fg">{title}</h2>
          {description && (
            <p className="mt-1 text-[12.5px] text-fg-muted">{description}</p>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
