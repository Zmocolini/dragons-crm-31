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

export const WEEK_DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];

const RO_MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

/** Luni-ul săptămânii curente (00:00 local). Dacă azi e Duminică, tot săptămâna asta (nu următoarea). */
function currentMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Luni=0 ... Duminică=6
  d.setDate(d.getDate() - dow);
  return d;
}

/** Datele Luni-Duminică (zi din lună) pentru săptămâna curentă. */
function computeWeekDates(): number[] {
  const monday = currentMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });
}

/** Etichetă „07 - 13 Septembrie 2026" (sau cross-lună „28 Aug - 03 Sep 2026"). */
function computeWeekLabel(): string {
  const monday = currentMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const dd = (n: number) => String(n).padStart(2, "0");
  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    return `${dd(monday.getDate())} - ${dd(sunday.getDate())} ${RO_MONTHS[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${dd(monday.getDate())} ${RO_MONTHS[monday.getMonth()].slice(0, 3)} - ${dd(sunday.getDate())} ${RO_MONTHS[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`;
}

// Se recalculează la fiecare page load (SSR + client hydration). În taburi deschise
// peste noapte, componentele care afișează au un useEffect care re-compută zilnic.
export const WEEK_DATES: number[] = computeWeekDates();
export const WEEK_LABEL: string = computeWeekLabel();

const _now = new Date();
export const TODAY_DATE = _now.getDate();
export const TODAY_DOW = (_now.getDay() + 6) % 7; // Luni = 0

/** Helpers pentru re-calcul dinamic în componente (long-lived tabs). */
export function getWeekDatesNow(): number[] { return computeWeekDates(); }
export function getWeekLabelNow(): string { return computeWeekLabel(); }
export function getTodayDowNow(): number { return (new Date().getDay() + 6) % 7; }
export const NOW_HOUR = 13.75; // 13:45 (linia „acum" — oră demo fixă)
export const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 08:00–19:00

// TODO(real-users): SELECT din tabela `calendar_events` filtrată pe tenant + user.
export function buildEvents(): CalEvent[] {
  return [];
}

export const UPCOMING: Array<{ time: string; title: string; sub: string; when: string; cat: EventCategory }> = [];
export const REMINDERS: Array<{ icon: LucideIcon; text: string; date: string }> = [];
export { Bike };
