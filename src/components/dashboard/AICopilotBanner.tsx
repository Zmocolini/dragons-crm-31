"use client";

import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { useSession } from "@/lib/rbac/session";

export function AICopilotBanner() {
  const { can } = useSession();
  const canUse = can("ai.use");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/25 via-violet-600/20 to-purple-700/25 p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 -bottom-16 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-violet-900/40">
          <Bot size={26} className="text-white" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-fg">AI Copilot</h3>
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
              <Sparkles size={9} /> Nou
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">
            Lasă AI-ul să te ajute cu recrutarea, documentele și rapoartele!
          </p>
        </div>
        {canUse ? (
          <Link
            href="/ai"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-4 py-2 text-[12.5px] font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Încearcă acum <ArrowRight size={13} />
          </Link>
        ) : (
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-fg-dim">
            Doar administratori
          </span>
        )}
      </div>
    </div>
  );
}
