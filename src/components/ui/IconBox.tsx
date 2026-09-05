import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "success" | "info" | "warn" | "indigo" | "danger" | "accent";

const TONE: Record<Tone, string> = {
  success:
    "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  warn: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  indigo: "bg-indigo-500/12 text-indigo-400 ring-indigo-500/20",
  danger: "bg-red-500/12 text-red-400 ring-red-500/20",
  accent: "bg-violet-500/12 text-violet-400 ring-violet-500/20",
};

export function IconBox({
  icon: Icon,
  tone,
  size = 40,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: number;
  className?: string;
}) {
  const iconSize = Math.round(size * 0.5);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg ring-1",
        TONE[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
