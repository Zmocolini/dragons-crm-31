"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Text închis pe culori deschise (galben, mentă, albastru deschis), alb pe cele închise. */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.3 ? "#0f172a" : "#ffffff";
}

// ── Popover (click-outside close) ────────────────────────────────────────────
// Meniul se randează într-un portal cu poziționare `fixed` calculată din trigger,
// ca să NU fie clipat de containere `overflow-x-auto`/`overflow-hidden` (ex. tabele).
export function Popover({
  trigger,
  children,
  align = "left",
  className,
}: {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords(
      align === "right"
        ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }
        : { top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 8) },
    );
  }, [align]);

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onReflow = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, place]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, right: coords.right }}
            className={cn("z-[999] rounded-xl border border-line bg-card shadow-2xl", className)}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── Select (native, stilizat) ────────────────────────────────────────────────
export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-lg border border-line bg-card-hover px-3 py-2 pr-8 text-[12.5px] font-medium text-fg outline-none focus:border-accent/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
    </div>
  );
}

// ── Chip (multi-select platforme) ────────────────────────────────────────────
export function Chip({
  active,
  onClick,
  onRemove,
  color,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  color?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors",
        active
          ? "border-transparent text-white"
          : "border-line bg-card-hover text-fg-muted hover:text-fg",
      )}
      style={active && color ? { backgroundColor: color, color: readableOn(color) } : undefined}
    >
      {children}
      {active && onRemove && (
        <X
          size={12}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
}

// ── Checkbox row (multi-select orașe) ────────────────────────────────────────
export function CheckRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]"
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-accent bg-accent text-white" : "border-line",
        )}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

// ── Delta pill (% colorat) ───────────────────────────────────────────────────
export function DeltaPill({ value, tone }: { value: number; tone?: "auto" | "info" }) {
  const positive = value > 0;
  const negative = value < 0;
  const color =
    tone === "info"
      ? "text-[color:var(--color-info)]"
      : positive
        ? "text-[color:var(--color-success)]"
        : negative
          ? "text-[color:var(--color-danger)]"
          : "text-fg-dim";
  const sign = positive ? "▲" : negative ? "▼" : "•";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", color)}>
      {sign} {positive ? "+" : ""}{value}%
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = "#3b82f6" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Empty / Error / Skeleton ─────────────────────────────────────────────────
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <div className="text-[13px] font-semibold text-fg-muted">{title}</div>
      {hint && <div className="text-[12px] text-fg-dim">{hint}</div>}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl border border-line bg-card", className)} />;
}
