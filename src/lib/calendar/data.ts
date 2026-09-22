import type { LucideIcon } from "lucide-react";
import { Bike, CalendarDays, Car, FileText, Hotel, LifeBuoy, Trophy, Wallet } from "lucide-react";

// Modul Calendar — evenimente derivate din activitatea CRM (plăți/documente/etc.).
// „Azi" în domeniul mock = 2026-09-10 13:45. TODO(real-users): agregă din tabelele reale.

export type EventCategory = "plati" | "documente" | "cazari" | "vehicule" | "subcontractori" | "suport" | "intalniri";

export const CATEGORIES: Array<{ key: EventCategory; label: string; color: string; icon: LucideIcon }> = [
  { key: "plati", label: "Plăți", color: "#3b82f6", icon: Wallet },
  { key: "documente", label: "Documente", color: "#eab308", icon: FileText },
  { key: "cazari", label: "Cazări", color: "#ec4899", icon: Hotel },
  { key: "vehicule", label: "Vehicule", color: "#06b6d4", icon: Car },
  { key: "subcontractori", label: "Subcontractori", color: "#f97316", icon: Trophy },
  { key: "suport", label: "Suport / Probleme", color: "#ef4444", icon: LifeBuoy },
  { key: "intalniri", label: "Întâlniri", color: "#6366f1", icon: CalendarDays },
];
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<EventCategory, (typeof CATEGORIES)[number]>;

export type CalEvent = {
  id: string; title: string; subtitle: string; category: EventCategory;
  day: number; startHour: number; endHour: number; mine: boolean; owner: string;
};

export const WEEK_LABEL = "07 - 13 Septembrie 2026";
export const WEEK_DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const WEEK_DATES = [7, 8, 9, 10, 11, 12, 13];

// „Azi" derivă din data reală (aliniat cu header/Dashboard). Săptămâna afișată e fixă
// (07–13 Sep 2026); dacă data reală iese din interval, cădem pe Vineri 11.
const _now = new Date();
export const TODAY_DATE =
  _now.getFullYear() === 2026 && _now.getMonth() === 8 && WEEK_DATES.includes(_now.getDate())
    ? _now.getDate()
    : 11;
export const TODAY_DOW = WEEK_DATES.indexOf(TODAY_DATE); // index în WEEK_DAYS/WEEK_DATES
export const NOW_HOUR = 13.75; // 13:45 (linia „acum" — oră demo fixă)
export const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 08:00–19:00

// TODO(real-users): SELECT din tabela `calendar_events` filtrată pe tenant + user.
export function buildEvents(): CalEvent[] {
  return [];
}

export const UPCOMING: Array<{ time: string; title: string; sub: string; when: string; cat: EventCategory }> = [];
export const REMINDERS: Array<{ icon: LucideIcon; text: string; date: string }> = [];
export { Bike };
