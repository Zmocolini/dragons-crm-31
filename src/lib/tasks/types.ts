/** Task-uri de flotă: subcontractorul ridică (activare cont, mutare, tichet), owner-ul rezolvă.
 *  Sincronizate prin `crm31-fleet-tasks` cu owner = `createdBy` → subcontractorul își vede doar task-urile lui, Global Owner le vede pe toate. */

export type FleetTaskKind = "activation" | "phone_change" | "vehicle_change" | "transfer" | "ticket" | "other";
export type FleetTaskPriority = "normal" | "high" | "urgent";
export type FleetTaskStatus = "open" | "in_progress" | "resolved";

export const TASK_KIND_LABEL: Record<FleetTaskKind, string> = {
  activation: "Activare cont / curier",
  phone_change: "Schimbare număr",
  vehicle_change: "Schimbare vehicul",
  transfer: "Mutare",
  ticket: "Tichet / Problemă",
  other: "Altceva",
};
export const TASK_PRIORITY_LABEL: Record<FleetTaskPriority, string> = { normal: "Normală", high: "Ridicată", urgent: "Urgentă" };
export const TASK_STATUS_LABEL: Record<FleetTaskStatus, string> = { open: "Deschis", in_progress: "În lucru", resolved: "Rezolvat" };

export type FleetTask = {
  id: string;
  kind: FleetTaskKind;
  title: string;
  details: string;
  priority: FleetTaskPriority;
  status: FleetTaskStatus;
  courierId?: string;
  courierName?: string;
  /** Emailul contului care a ridicat task-ul = proprietarul înregistrării la sync. Nu se schimbă la editare. */
  createdBy: string;
  raisedBy: string;
  tenantId: string;
  createdAtIso: string;
  updatedAtIso: string;
  resolvedAtIso?: string;
};

/** Element din „top urgențe": task ridicat de om SAU alertă generată de sistem (curier pending peste prag). */
export type UrgentItem =
  | { source: "task"; id: string; score: number; days: number; task: FleetTask }
  | { source: "auto"; id: string; score: number; days: number; courierId: string; courierName: string; statusLabel: string };

const PRIORITY_WEIGHT: Record<FleetTaskPriority, number> = { urgent: 100, high: 50, normal: 10 };
const DAY_MS = 86_400_000;

const pick = <T extends string>(v: unknown, allowed: Record<T, string>, fallback: T): T =>
  typeof v === "string" && Object.hasOwn(allowed, v) ? (v as T) : fallback;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Granița de încredere: task-urile vin din localStorage/sync ca JSON scris de alți clienți (alt subcontractor, versiune veche).
 *  Un kind/prioritate necunoscut nu are voie să pice UI-ul sau să dea NaN în scor. Înregistrările fără id/createdBy se aruncă. */
export function normalizeTask(raw: unknown): FleetTask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!str(r.id) || !str(r.createdBy)) return null;
  return {
    id: str(r.id),
    kind: pick(r.kind, TASK_KIND_LABEL, "other"),
    title: str(r.title).slice(0, 140) || "(fără titlu)",
    details: str(r.details).slice(0, 1000),
    priority: pick(r.priority, TASK_PRIORITY_LABEL, "normal"),
    status: pick(r.status, TASK_STATUS_LABEL, "open"),
    courierId: str(r.courierId) || undefined,
    courierName: str(r.courierName) || undefined,
    createdBy: str(r.createdBy),
    raisedBy: str(r.raisedBy),
    tenantId: str(r.tenantId),
    createdAtIso: str(r.createdAtIso),
    updatedAtIso: str(r.updatedAtIso),
    resolvedAtIso: str(r.resolvedAtIso) || undefined,
  };
}

/** Ordonează după urgență: prioritate + vechime (3 puncte/zi); alertele automate valorează cât o prioritate „ridicată" minus puțin. Rezolvatele ies. */
export function rankUrgent(
  tasks: FleetTask[],
  stuck: { courierId: string; courierName: string; statusLabel: string; days: number }[],
  nowMs = Date.now(),
): UrgentItem[] {
  const items: UrgentItem[] = [];
  for (const t of tasks) {
    if (t.status === "resolved") continue;
    const days = Math.max(0, Math.floor((nowMs - Date.parse(t.createdAtIso)) / DAY_MS)) || 0;
    items.push({ source: "task", id: t.id, days, task: t, score: (PRIORITY_WEIGHT[t.priority] ?? PRIORITY_WEIGHT.normal) + days * 3 + (t.status === "open" ? 5 : 0) });
  }
  for (const s of stuck) items.push({ source: "auto", id: `auto_${s.courierId}`, days: s.days, courierId: s.courierId, courierName: s.courierName, statusLabel: s.statusLabel, score: 40 + s.days * 3 });
  return items.sort((a, b) => b.score - a.score);
}
