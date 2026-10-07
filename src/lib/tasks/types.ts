/** Task-uri de flotă: subcontractorul ridică (activare cont, mutare, tichet), owner-ul rezolvă.
 *  Sincronizate prin `crm31-fleet-tasks` cu owner = `createdBy` → subcontractorul își vede doar task-urile lui, Global Owner le vede pe toate. */

export type FleetTaskKind = "activation" | "transfer" | "ticket" | "other";
export type FleetTaskPriority = "normal" | "high" | "urgent";
export type FleetTaskStatus = "open" | "in_progress" | "resolved";

export const TASK_KIND_LABEL: Record<FleetTaskKind, string> = {
  activation: "Activare cont",
  transfer: "Mutare",
  ticket: "Tichet",
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
    items.push({ source: "task", id: t.id, days, task: t, score: PRIORITY_WEIGHT[t.priority] + days * 3 + (t.status === "open" ? 5 : 0) });
  }
  for (const s of stuck) items.push({ source: "auto", id: `auto_${s.courierId}`, days: s.days, courierId: s.courierId, courierName: s.courierName, statusLabel: s.statusLabel, score: 40 + s.days * 3 });
  return items.sort((a, b) => b.score - a.score);
}
