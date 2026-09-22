"use client";

import { useState } from "react";
import {
  Briefcase, Building2, ExternalLink, Handshake, Mail, MapPin, Phone,
  Sparkles, Store, TrendingUp, Wine, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

// TODO(real-users): mutare pe tabel `partner_projects` cu FK către partners + tenant.

type ProjectStage = "activ" | "in_dezvoltare" | "cauta_investitori" | "pilot";
type ProjectSector = "horeca" | "logistica" | "retail" | "servicii" | "tech" | "auto";

type Partner = {
  id: string;
  name: string;
  role: string;
  city: string;
  phone: string;
  email: string;
  projects: PartnerProject[];
};

type PartnerProject = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  sector: ProjectSector;
  stage: ProjectStage;
  city: string;
  palette: [string, string, string];
  icon: LucideIcon;
};

const STAGE_LABEL: Record<ProjectStage, string> = {
  activ:               "Activ",
  in_dezvoltare:       "În dezvoltare",
  cauta_investitori:   "Caută investitori",
  pilot:               "Pilot",
};

const STAGE_STYLE: Record<ProjectStage, string> = {
  activ:               "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_dezvoltare:       "bg-sky-500/15 text-sky-300 border-sky-500/30",
  cauta_investitori:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pilot:               "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const SECTOR_LABEL: Record<ProjectSector, string> = {
  horeca:    "HoReCa",
  logistica: "Logistică",
  retail:    "Retail",
  servicii:  "Servicii",
  tech:      "Tech",
  auto:      "Auto",
};

const SECTOR_ICON: Record<ProjectSector, LucideIcon> = {
  horeca:    Wine,
  logistica: TrendingUp,
  retail:    Store,
  servicii:  Handshake,
  tech:      Sparkles,
  auto:      Wrench,
};

const PARTNERS: Partner[] = [
  {
    id: "p1",
    name: "Andrei Popescu",
    role: "Co-fondator",
    city: "București",
    phone: "+40 722 111 222",
    email: "andrei@example.ro",
    projects: [
      {
        id: "p1_1",
        name: "Bucătăria Dragonului",
        tagline: "Ghost kitchen pentru livrări rapide",
        description: "Bucătărie exclusiv pentru delivery, meniuri variate, timp de preparare sub 12 minute. Parteneriat direct cu curierii flotei.",
        sector: "horeca",
        stage: "activ",
        city: "București",
        palette: ["#7c2d12", "#c2410c", "#fed7aa"],
        icon: Wine,
      },
      {
        id: "p1_2",
        name: "SprintCargo",
        tagline: "Livrări intra-oraș pentru firme mici",
        description: "Marketplace B2B pentru livrări urgente între magazine, ateliere, laboratoare medicale. 30 min garantat.",
        sector: "logistica",
        stage: "in_dezvoltare",
        city: "București + Ilfov",
        palette: ["#0f172a", "#1e3a8a", "#93c5fd"],
        icon: TrendingUp,
      },
    ],
  },
  {
    id: "p2",
    name: "Ana Marinescu",
    role: "Founder & CEO",
    city: "Cluj-Napoca",
    phone: "+40 745 333 444",
    email: "ana@example.ro",
    projects: [
      {
        id: "p2_1",
        name: "Cluj Bistro Hub",
        tagline: "5 bistrouri, o singură comandă",
        description: "Rețea de 5 bistrouri centrale care partajează bucătărie și livrează sub același brand agregat.",
        sector: "horeca",
        stage: "activ",
        city: "Cluj-Napoca",
        palette: ["#052e16", "#166534", "#a3e635"],
        icon: Wine,
      },
    ],
  },
  {
    id: "p3",
    name: "Radu Ionescu",
    role: "Managing Partner",
    city: "Timișoara",
    phone: "+40 733 555 666",
    email: "radu@example.ro",
    projects: [
      {
        id: "p3_1",
        name: "MotoStop",
        tagline: "Service scutere & e-bike la domiciliu",
        description: "Mecanici mobili care ajung la curieri în 45 min pentru reparații rapide. Contract cu flota.",
        sector: "auto",
        stage: "pilot",
        city: "Timișoara",
        palette: ["#431407", "#c2410c", "#fdba74"],
        icon: Wrench,
      },
      {
        id: "p3_2",
        name: "Iulius Deliveries",
        tagline: "Preluare comandă direct din mall",
        description: "Punct de preluare integrat cu food court-ul din Iulius Town. Curierii intră, iau, pleacă în 3 minute.",
        sector: "retail",
        stage: "cauta_investitori",
        city: "Timișoara",
        palette: ["#3b0764", "#7c3aed", "#e9d5ff"],
        icon: Store,
      },
    ],
  },
  {
    id: "p4",
    name: "Mihai Georgescu",
    role: "Co-fondator",
    city: "Iași",
    phone: "+40 720 777 888",
    email: "mihai@example.ro",
    projects: [
      {
        id: "p4_1",
        name: "Copou Coffee Route",
        tagline: "Cafenele partenere pe traseul curierilor",
        description: "Rețea de 8 cafenele care oferă reduceri curierilor + oferă pachete de mic-dejun pentru delivery.",
        sector: "horeca",
        stage: "activ",
        city: "Iași",
        palette: ["#422006", "#a16207", "#fef08a"],
        icon: Wine,
      },
    ],
  },
  {
    id: "p5",
    name: "Elena Diaconu",
    role: "CTO & Co-fondator",
    city: "București",
    phone: "+40 758 999 000",
    email: "elena@example.ro",
    projects: [
      {
        id: "p5_1",
        name: "SmartRoute",
        tagline: "AI pentru optimizarea traseelor",
        description: "Algoritm care grupează comenzile pentru livrări multiple simultan. Curierul face 3 livrări în timpul uneia.",
        sector: "tech",
        stage: "cauta_investitori",
        city: "București / remote",
        palette: ["#020617", "#3730a3", "#c4b5fd"],
        icon: Sparkles,
      },
    ],
  },
  {
    id: "p6",
    name: "Cătălin Vasile",
    role: "Owner",
    city: "Constanța",
    phone: "+40 749 121 314",
    email: "catalin@example.ro",
    projects: [
      {
        id: "p6_1",
        name: "SeaSide Meal Prep",
        tagline: "Meniuri fitness livrate zilnic",
        description: "Producție proprie de meniuri healthy cu abonamente săptămânale. Livrare de la Mamaia la Faleză.",
        sector: "horeca",
        stage: "in_dezvoltare",
        city: "Constanța",
        palette: ["#0c4a6e", "#0284c7", "#7dd3fc"],
        icon: Wine,
      },
    ],
  },
];

type FlatProject = PartnerProject & {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  partnerPhone: string;
  partnerEmail: string;
};

type BoardPoster = {
  id: string;
  file: string;
  title: string;
  tag: string;
  rotate: number;      // deg, ușor înclinat ca sticker
};

const BOARD_POSTERS: BoardPoster[] = [
  { id: "tw",  file: "/club/travel-wellness.png",  title: "Travel & Wellness",   tag: "6 platforme · o audiență",  rotate: -2.5 },
  { id: "da",  file: "/club/dragons-alliance.png", title: "Dragons Alliance",    tag: "Un contract · tot ecosistemul", rotate: 1.5 },
  { id: "ts",  file: "/club/taste.png",            title: "TASTE",               tag: "Cafenea · bakery · bistro", rotate: -1.2 },
  { id: "wm",  file: "/club/workmate.png",         title: "Workmate",            tag: "Recrutare din Asia",        rotate: 2.2 },
  { id: "fn",  file: "/club/finance.png",          title: "Finance",             tag: "Educație · analiză · trading", rotate: -1.8 },
];

function flattenProjects(partners: Partner[]): FlatProject[] {
  const out: FlatProject[] = [];
  for (const p of partners) {
    for (const pr of p.projects) {
      out.push({
        ...pr,
        partnerId: p.id,
        partnerName: p.name,
        partnerRole: p.role,
        partnerPhone: p.phone,
        partnerEmail: p.email,
      });
    }
  }
  return out;
}

export function PartnersClub() {
  const [sectorFilter, setSectorFilter] = useState<ProjectSector | "all">("all");
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allProjects = flattenProjects(PARTNERS);
  const totalProjects = allProjects.length;

  const filtered = allProjects.filter((pr) =>
    (sectorFilter === "all" || pr.sector === sectorFilter) &&
    (stageFilter === "all" || pr.stage === stageFilter));

  return (
    <div className="flex flex-col gap-3">
      {/* Manifest scurt */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/20 text-amber-300">
            <Handshake size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-fg">Clubul Antreprenorilor</div>
            <p className="text-[11.5px] text-fg-muted">
              {PARTNERS.length} asociați · {totalProjects} proiecte · click pe un card pentru contact
            </p>
          </div>
        </div>
      </Card>

      {/* Panou cu oferte / proiecte / business-uri */}
      <PosterBoard />


      {/* Filtre — compacte, un rând */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={sectorFilter === "all"} onClick={() => setSectorFilter("all")} label={`Toate ${totalProjects}`} />
        {(Object.keys(SECTOR_LABEL) as ProjectSector[]).map((s) => {
          const count = allProjects.filter((pr) => pr.sector === s).length;
          if (count === 0) return null;
          const Icon = SECTOR_ICON[s];
          return (
            <FilterChip
              key={s}
              active={sectorFilter === s}
              onClick={() => setSectorFilter(s)}
              icon={Icon}
              label={`${SECTOR_LABEL[s]} ${count}`}
            />
          );
        })}
        <span className="mx-1 h-4 w-px bg-line" />
        <FilterChip active={stageFilter === "all"} onClick={() => setStageFilter("all")} label="Orice stare" />
        {(Object.keys(STAGE_LABEL) as ProjectStage[]).map((st) => (
          <FilterChip
            key={st}
            active={stageFilter === st}
            onClick={() => setStageFilter(st)}
            label={STAGE_LABEL[st]}
          />
        ))}
      </div>

      {/* Grid flat, unu lângă altul, click = expand */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-fg-muted">
          Niciun proiect cu aceste filtre.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((proj) => (
            <ProjectMiniCard
              key={proj.id}
              project={proj}
              expanded={selectedId === proj.id}
              onToggle={() => setSelectedId((id) => id === proj.id ? null : proj.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, icon: Icon }: {
  active: boolean; onClick: () => void; label: string; icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
          : "border-line bg-card text-fg-muted hover:bg-card-hover hover:text-fg",
      )}
    >
      {Icon && <Icon size={10} />}
      {label}
    </button>
  );
}

/** Card compact interactiv. Click = expand cu descriere + contact partener. */
function ProjectMiniCard({ project, expanded, onToggle }: {
  project: FlatProject; expanded: boolean; onToggle: () => void;
}) {
  const [from, to, accent] = project.palette;
  const Icon = project.icon;

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card transition-all cursor-pointer",
        expanded
          ? "border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30"
          : "border-line/70 hover:border-violet-500/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/30",
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
    >
      {/* Header vizual mic */}
      <div
        className="relative h-20 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        <div
          className="absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-70"
          style={{ background: accent }}
        />
        <div className="relative flex h-full items-center gap-2.5 px-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm transition-transform group-hover:scale-110"
            style={{ boxShadow: `0 6px 20px -6px ${accent}` }}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-white/75">
              {SECTOR_LABEL[project.sector]}
            </div>
            <div className="truncate text-[14px] font-bold leading-tight text-white">
              {project.name}
            </div>
          </div>
        </div>
      </div>

      {/* Corp */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
            STAGE_STYLE[project.stage],
          )}>
            <span
              className="inline-block h-1 w-1 rounded-full"
              style={{
                background: project.stage === "activ" ? "#34d399"
                  : project.stage === "in_dezvoltare" ? "#38bdf8"
                  : project.stage === "cauta_investitori" ? "#fbbf24"
                  : "#a78bfa",
              }}
            />
            {STAGE_LABEL[project.stage]}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-fg-dim">
            <MapPin size={10} />
            {project.city}
          </span>
        </div>

        <div className="text-[12px] font-semibold text-fg">{project.tagline}</div>

        {/* Detalii expandate */}
        {expanded && (
          <div className="mt-1 flex flex-col gap-2 border-t border-line/60 pt-2">
            <p className="text-[11.5px] leading-relaxed text-fg-muted">{project.description}</p>
            <div className="flex items-center gap-2 rounded-md bg-card-hover px-2 py-1.5">
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/30 text-[10px] font-black text-white"
              >
                {project.partnerName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-fg">{project.partnerName}</div>
                <div className="truncate text-[10px] text-fg-dim">{project.partnerRole}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a
                href={`tel:${project.partnerPhone.replace(/\s/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-card-hover px-2 py-1 text-[11px] font-semibold text-fg hover:border-emerald-500/40 hover:text-emerald-200"
              >
                <Phone size={11} /> Sună
              </a>
              <a
                href={`mailto:${project.partnerEmail}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-card-hover px-2 py-1 text-[11px] font-semibold text-fg hover:border-sky-500/40 hover:text-sky-200"
              >
                <Mail size={11} /> Email
              </a>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
              >
                Detalii <ExternalLink size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

void Briefcase;
void Building2;

/** Panou de plută cu postere ca stickere. Click = lightbox cu poza mare. */
function PosterBoard() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = BOARD_POSTERS.find((p) => p.id === openId) ?? null;

  return (
    <>
      <section
        className="relative overflow-hidden rounded-2xl border border-amber-900/40 p-5 shadow-inner"
        style={{
          backgroundColor: "#3b2412",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(0,0,0,0.35) 0%, transparent 55%), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 6px)",
        }}
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[15px] font-black tracking-tight text-amber-100">
              Panou · Oferte, proiecte & business-uri
            </div>
            <div className="text-[11.5px] text-amber-200/70">
              {BOARD_POSTERS.length} postere · click pentru mărire
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {BOARD_POSTERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(p.id)}
              aria-label={`Vezi ${p.title}`}
              className="group relative block w-full transition-transform hover:!rotate-0 hover:scale-[1.03] hover:z-10"
              style={{ transform: `rotate(${p.rotate}deg)` }}
            >
              {/* Pin decorativ */}
              <span
                className="absolute left-1/2 top-0 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #f87171 0%, #b91c1c 60%, #7f1d1d 100%)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(0,0,0,0.4)",
                }}
              />
              <div className="overflow-hidden rounded-md border border-white/10 bg-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.6)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.file}
                  alt={p.title}
                  className="block h-auto w-full"
                  loading="lazy"
                />
              </div>
              <div className="mt-1.5 rounded-sm bg-amber-100/95 px-2 py-1 text-center shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-wider text-stone-900">
                  {p.title}
                </div>
                <div className="text-[9.5px] text-stone-600">{p.tag}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-label={open.title}
        >
          <button
            type="button"
            onClick={() => setOpenId(null)}
            aria-label="Închide"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ExternalLink size={16} className="rotate-45" />
          </button>
          <div className="max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.file}
              alt={open.title}
              className="max-h-[92vh] max-w-[92vw] rounded-lg shadow-2xl"
            />
            <div className="mt-2 text-center">
              <div className="text-[16px] font-bold text-white">{open.title}</div>
              <div className="text-[12px] text-white/70">{open.tag}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
