"use client";

import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import { PAY_STATE_LABEL, PAY_STATE_COLOR, type CourierPayState } from "@/lib/reports/facts";
import { cn } from "@/lib/utils/cn";

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function CourierAvatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: colorFor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

const STATUS_COLOR: Record<CourierStatus, string> = {
  active: "#22c55e",
  in_activation: "#3b82f6",
  paused: "#f59e0b",
  stopped: "#ef4444",
  draft: "#64748b",
};

export function StatusDot({ status }: { status: CourierStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
      {COURIER_STATUS_LABEL[status]}
    </span>
  );
}

export function PayStateBadge({ state }: { state: CourierPayState }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium")}
      style={{
        color: PAY_STATE_COLOR[state],
        borderColor: `${PAY_STATE_COLOR[state]}40`,
        backgroundColor: `${PAY_STATE_COLOR[state]}1f`,
      }}
    >
      {PAY_STATE_LABEL[state]}
    </span>
  );
}
