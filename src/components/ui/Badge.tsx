import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone =
  | "success"
  | "info"
  | "warn"
  | "danger"
  | "neutral"
  | "accent"
  | "bolt"
  | "wolt"
  | "glovo";

const TONE: Record<Tone, string> = {
  success: "bg-success/12 text-[color:var(--color-success)] border-success/25",
  info: "bg-info/12 text-[color:var(--color-info)] border-info/25",
  warn: "bg-warn/12 text-[color:var(--color-warn)] border-warn/25",
  danger: "bg-danger/12 text-[color:var(--color-danger)] border-danger/25",
  neutral: "bg-white/5 text-fg-muted border-white/10",
  accent: "bg-accent/15 text-[color:var(--color-accent-3)] border-accent/25",
  bolt: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  wolt: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  glovo: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: { tone?: Tone; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4",
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
