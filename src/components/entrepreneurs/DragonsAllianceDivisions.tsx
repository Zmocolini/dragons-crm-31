"use client";

import { Truck, Users, Sparkles, TrendingUp, UtensilsCrossed, Leaf, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Division = {
  name: string;
  brand: string;
  tagline: string;
  icon: LucideIcon;
  gradient: string;    // Tailwind gradient (bg card)
  ring: string;        // ring color for icon
  url?: string;
};

const DIVISIONS: Division[] = [
  {
    name: "Transport",
    brand: "DragonDelivery",
    tagline: "Flota nu e problema — administrarea ei zilnică este. Noi o preluăm integral. 23+ orașe România.",
    icon: Truck,
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    ring: "ring-violet-400/40",
    url: "https://dragondelivery.ro",
  },
  {
    name: "Recruitment International",
    brand: "WorkMate",
    tagline: "Personal sourcing din Asia și Golf: vize, permise, cazare, onboarding — pachet complet.",
    icon: Users,
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    ring: "ring-emerald-400/40",
  },
  {
    name: "AI Orchestrator",
    brand: "Legal AI",
    tagline: "Agenți AI care ajung în producție, nu doar în prezentări. Stack multi-model.",
    icon: Sparkles,
    gradient: "from-fuchsia-600 via-pink-600 to-rose-700",
    ring: "ring-fuchsia-400/40",
  },
  {
    name: "Finance",
    brand: "Analytics & Trading",
    tagline: "Analiză statistică pentru comunitatea de pariuri sportive și software algoritmic de trading.",
    icon: TrendingUp,
    gradient: "from-amber-500 via-orange-600 to-red-700",
    ring: "ring-amber-400/40",
  },
  {
    name: "HoReCa",
    brand: "Taste",
    tagline: "Restaurant-bar halal în Cluj. AI în operare de la prima zi: comenzi, loialitate, marketing.",
    icon: UtensilsCrossed,
    gradient: "from-sky-600 via-blue-600 to-indigo-700",
    ring: "ring-sky-400/40",
  },
  {
    name: "Travel & Wellness",
    brand: "Ecosistem Premium",
    tagline: "Rețea de 6 platforme conectate (Masaj.ro, Healingpedia, Dragons Adventures) cu clientelă premium.",
    icon: Leaf,
    gradient: "from-green-600 via-lime-600 to-emerald-700",
    ring: "ring-green-400/40",
  },
];

export function DragonsAllianceDivisions() {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[18px] font-bold text-fg">Dragons Alliance · Cele 6 Diviziuni</h2>
        <a
          href="https://www.dragonsalliance.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-violet-300 hover:underline"
        >
          dragonsalliance.eu <ExternalLink size={11} />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIVISIONS.map((d) => {
          const Icon = d.icon;
          return (
            <a
              key={d.name}
              href={d.url ?? "https://www.dragonsalliance.eu"}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${d.gradient} p-5 shadow-lg shadow-black/30 transition-transform hover:scale-[1.02] hover:shadow-2xl`}
            >
              {/* Decorative background pattern */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-black/20 blur-2xl" />

              {/* Icon */}
              <div className={`relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ${d.ring}`}>
                <Icon size={28} className="text-white drop-shadow" />
              </div>

              {/* Text */}
              <div className="relative mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  {d.name}
                </div>
                <div className="mt-0.5 text-[19px] font-black tracking-tight text-white drop-shadow">
                  {d.brand}
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-white/90">
                  {d.tagline}
                </p>
              </div>

              {/* Hover link indicator */}
              <div className="relative mt-3 flex items-center gap-1 text-[11.5px] font-semibold text-white/80 group-hover:text-white">
                Descoperă <ExternalLink size={11} />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
