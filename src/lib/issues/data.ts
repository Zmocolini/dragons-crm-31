import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { PlatformKey } from "@/lib/dashboard/types";

// Modul Probleme / Support — tichete derivate DETERMINIST din roster.
// TODO(real-users): tabele `tickets` + `ticket_messages` + `ticket_activity`.

export type TicketCategory = "platform" | "payments" | "equipment" | "accommodation" | "documents" | "contracts" | "legal" | "admin";
export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  platform: "Platformă", payments: "Plăți", equipment: "Echipamente", accommodation: "Cazare",
  documents: "Documente", contracts: "Contracte", legal: "Legal", admin: "Administrativ",
};
export const CATEGORY_COLOR: Record<TicketCategory, string> = {
  platform: "#3b82f6", payments: "#22c55e", equipment: "#f59e0b", accommodation: "#ec4899",
  documents: "#eab308", contracts: "#8b5cf6", legal: "#ef4444", admin: "#64748b",
};

export type TicketPriority = "normal" | "high" | "urgent";
export const PRIORITY_LABEL: Record<TicketPriority, string> = { normal: "Normală", high: "Ridicată", urgent: "Urgentă" };
export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  normal: "bg-white/[0.05] text-fg-muted border-white/10",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  urgent: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = { open: "Deschis", in_progress: "În lucru", resolved: "Rezolvat", closed: "Închis" };
export const TICKET_STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  closed: "bg-white/[0.05] text-fg-muted border-white/10",
};

export type TicketMessage = { id: string; author: string; isOperator: boolean; internal: boolean; text: string; at: string };
export type Ticket = {
  id: string; number: number; subject: string; description: string;
  requesterName: string; requesterRole: string; requesterPhone: string;
  category: TicketCategory; platform: PlatformKey; priority: TicketPriority; status: TicketStatus;
  createdIso: string; updatedIso: string; assignee: string; filesCount: number;
  messages: TicketMessage[]; tenantId: string;
};

const SUBJECTS: Array<[string, TicketCategory]> = [
  ["Nu pot să mă loghez în aplicație", "platform"],
  ["Plata din săptămâna trecută nu a ajuns", "payments"],
  ["Geacă termică deteriorată", "equipment"],
  ["Problemă cu cazarea - apă caldă", "accommodation"],
  ["Permis de ședere aproape expirat", "documents"],
  ["Clarificare clauze contract", "contracts"],
  ["Amendă rutieră contestație", "legal"],
  ["Schimbare date bancare", "admin"],
  ["Cont Bolt suspendat temporar", "platform"],
  ["Bonus neaplicat corect", "payments"],
];
const OPERATORS = ["Alex Tudor", "Maria Ionescu", "Bogdan Marin"];

function hash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const DAY = 86400000; const NOW = new Date("2026-09-10T13:45:00Z").getTime();
function iso(daysAgo: number, h = 10): string { return new Date(NOW - daysAgo * DAY).toISOString(); }

export function buildTickets(couriers: CourierRow[]): Ticket[] {
  const base = couriers.slice(0, 24);
  return base.map((c, i) => {
    const seed = hash("tick_" + c.id + i);
    const [subject, category] = SUBJECTS[seed % SUBJECTS.length];
    const priority: TicketPriority = seed % 6 === 0 ? "urgent" : seed % 3 === 0 ? "high" : "normal";
    const status: TicketStatus = seed % 7 === 0 ? "closed" : seed % 4 === 0 ? "resolved" : seed % 3 === 0 ? "open" : "in_progress";
    const createdDays = 1 + (seed % 28);
    return {
      id: `tk_${c.id}`,
      number: 5600 + i,
      subject,
      description: `${c.fullName} a raportat: „${subject}". Necesită verificare și rezolvare de către echipa de suport.`,
      requesterName: c.fullName, requesterRole: "Curier", requesterPhone: c.phone,
      category, platform: c.platforms[0] ?? "bolt", priority, status,
      createdIso: iso(createdDays), updatedIso: iso(Math.max(0, createdDays - 1 - (seed % 3))),
      assignee: OPERATORS[seed % OPERATORS.length], filesCount: seed % 3,
      messages: [
        { id: "m1", author: c.fullName, isOperator: false, internal: false, text: subject + ". Vă rog ajutați-mă.", at: iso(createdDays) },
        { id: "m2", author: OPERATORS[seed % OPERATORS.length], isOperator: true, internal: false, text: "Bună ziua! Am preluat solicitarea și verific acum.", at: iso(Math.max(0, createdDays - 1)) },
        { id: "m3", author: OPERATORS[seed % OPERATORS.length], isOperator: true, internal: true, text: "Notă internă: verificat în sistem, escaladat la platformă.", at: iso(Math.max(0, createdDays - 1)) },
      ],
      tenantId: c.tenantId,
    };
  });
}

export type TicketKpi = { total: number; resolved: number; resolvedPct: number; inProgress: number; inProgressPct: number; urgent: number; urgentPct: number; avgHours: number };
export function computeTicketKpi(list: Ticket[]): TicketKpi {
  const total = list.length;
  const resolved = list.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const inProgress = list.filter((t) => t.status === "in_progress").length;
  const urgent = list.filter((t) => t.priority === "urgent").length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return { total, resolved, resolvedPct: pct(resolved), inProgress, inProgressPct: pct(inProgress), urgent, urgentPct: pct(urgent), avgHours: 6 + (total % 10) };
}
