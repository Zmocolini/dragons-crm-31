"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { UpcomingTask } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const DUE_LABEL: Record<string, string> = {
  azi: "Azi",
  maine: "Mâine",
  vineri: "Vineri",
};

const DUE_TONE: Record<string, string> = {
  azi: "text-rose-300",
  maine: "text-amber-300",
  vineri: "text-fg-muted",
};

export function UpcomingTasksCard({ tasks }: { tasks: UpcomingTask[] }) {
  const [done, setDone] = useState<Set<string>>(
    () => new Set(tasks.filter((t) => t.done).map((t) => t.id)),
  );

  const items = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        checked: done.has(t.id),
      })),
    [tasks, done],
  );

  const toggle = (id: string) => {
    // TODO(real-users): persistă în DB via server action toggleTask(id).
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Următoarele task-uri</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-line/50 bg-card-2/40 p-3 text-center text-[12px] text-fg-muted">
            ✓ Niciun task în așteptare.
          </div>
        )}
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className="group flex w-full items-center gap-3 rounded-lg py-1.5 pl-1 pr-1 text-left transition-colors hover:bg-white/[0.02]"
          >
            <span
              aria-hidden
              className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                t.checked
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : "border-line group-hover:border-white/20",
              )}
            >
              {t.checked && <Check size={11} strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "flex-1 text-[12.5px] transition-colors",
                t.checked ? "text-fg-dim line-through" : "text-fg",
              )}
            >
              {t.title}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium",
                t.checked ? "text-fg-dim" : DUE_TONE[t.due] ?? "text-fg-muted",
              )}
            >
              {DUE_LABEL[t.due] ?? t.due}
            </span>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
