import { ArrowRight, Crown } from "lucide-react";

export function DragonsCommunityBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/70 via-orange-900/50 to-red-950/60 p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.18),transparent_60%)]"
      />
      <div className="relative flex items-center gap-4">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-orange-900/40">
          <Crown size={24} className="text-white" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold text-fg">Comunitatea Dragons</h3>
          <p className="mt-0.5 text-[12.5px] text-amber-100/80">
            Mai mult decât o flotă. O echipă.
          </p>
        </div>
        <a
          href="https://www.dragonsalliance.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[12.5px] font-semibold text-amber-100/90 transition-colors hover:bg-amber-400/20"
        >
          Intră în comunitate <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
