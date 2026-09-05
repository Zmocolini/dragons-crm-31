"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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

  if (!open) return null;

  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full rounded-2xl border border-line bg-card p-6 shadow-2xl",
          width,
        )}
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
        <div className="pr-8">
          <h2 id="dialog-title" className="text-[16px] font-bold text-fg">{title}</h2>
          {description && (
            <p className="mt-1 text-[12.5px] text-fg-muted">{description}</p>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-2">{children}</div>;
}
