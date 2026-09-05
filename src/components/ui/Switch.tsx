"use client";

import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onChange,
  disabled,
  ariaLabel,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-4 w-7" : "h-5 w-9";
  const thumb = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const translate = size === "sm" ? "translate-x-3" : "translate-x-4";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
        track,
        checked
          ? "border-emerald-400/60 bg-emerald-500/40"
          : "border-line bg-card-2",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block rounded-full bg-white shadow transition-transform",
          thumb,
          checked ? translate : "translate-x-0.5",
        )}
      />
    </button>
  );
}
