"use client";

import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export function TabPlaceholder({
  icon: Icon,
  title,
  description,
  planned,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  planned: string[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-indigo-500/25 text-violet-200 ring-1 ring-violet-500/30">
          <Icon size={22} />
        </span>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-violet-200">
            <Sparkles size={10} />
            În pregătire
          </div>
          <h3 className="mt-2 text-[18px] font-bold text-fg">{title}</h3>
          <p className="mt-1 text-[13px] text-fg-muted">{description}</p>
        </div>
        <ul className="mt-2 grid w-full gap-2 sm:grid-cols-2">
          {planned.map((p) => (
            <li
              key={p}
              className="rounded-lg border border-line/60 bg-card-2/40 px-3 py-2 text-left text-[12px] text-fg"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-violet-400 align-middle" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
