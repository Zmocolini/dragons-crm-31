"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { courierOwner, useAccountDirectory } from "@/lib/couriers/use-account-directory";
import { usePayments } from "@/lib/payments/context";
import { useDocuments } from "@/lib/documents/context";
import { useSettings } from "@/lib/settings/context";
import { getFactsBundle } from "@/lib/reports/facts";
import { buildTickets } from "@/lib/issues/data";
import { DOC_COLUMNS, columnForType } from "@/lib/documents/rules";
import { COURIER_STATUS_LABEL, PENDING_ALERT_DAYS, pendingDays } from "@/lib/couriers/types";
import type {
  CourierActivityPoint, ExpiringDocument, Platform, PlatformKey,
  RecentCourier, RecentIssue, RecentPayment, RevenuePoint, Trend, UpcomingTask,
} from "@/lib/dashboard/types";
import { CourierActivityChart } from "./CourierActivityChart";
import { WeeklyRevenueChart } from "./WeeklyRevenueChart";
import { ActivePlatformsCard } from "./ActivePlatformsCard";
import { RecentActivityTabs } from "./RecentActivityTabs";
import { ExpiringDocumentsCard } from "./ExpiringDocumentsCard";
import { UpcomingTasksCard } from "./UpcomingTasksCard";

const RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
function isoWeek(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fd = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fd + 3);
  return 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000));
}

function useFacts() {
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();
  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);
  return useMemo(() => getFactsBundle(activeFleetId, user.activeTenant.planUsage.used, fleetCouriers, fleetPayments), [activeFleetId, user.activeTenant.planUsage.used, fleetCouriers, fleetPayments]);
}

export function CourierActivityLive() {
  const bundle = useFacts();
  const data = useMemo<CourierActivityPoint[]>(() => {
    const byDay = new Map<string, { bolt: number; wolt: number; glovo: number }>();
    for (const f of bundle.facts) {
      const cur = byDay.get(f.dateIso) ?? { bolt: 0, wolt: 0, glovo: 0 };
      if (f.platform === "bolt" || f.platform === "wolt" || f.platform === "glovo") cur[f.platform] += f.orders;
      byDay.set(f.dateIso, cur);
    }
    return Array.from(byDay.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-90).map(([iso, v]) => {
      const d = new Date(iso + "T00:00:00Z");
      return { label: `${d.getUTCDate()} ${RO_MONTHS[d.getUTCMonth()]}`, ...v };
    });
  }, [bundle]);
  return <CourierActivityChart data={data} />;
}

export function WeeklyRevenueLive() {
  const bundle = useFacts();
  const { data, trend } = useMemo(() => {
    const byWeek = new Map<number, number>();
    for (const f of bundle.facts) { const w = isoWeek(f.dateIso); byWeek.set(w, (byWeek.get(w) ?? 0) + f.gross); }
    const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]).slice(-12);
    const points: RevenuePoint[] = weeks.map(([w, amount]) => ({ label: `S${w}`, amount: Math.round(amount) }));
    const last = points[points.length - 1]?.amount ?? 0;
    const prev = points[points.length - 2]?.amount ?? 0;
    const pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;
    const t: Trend = { direction: pct >= 0 ? "up" : "down", value: `${pct >= 0 ? "+" : ""}${pct}%` };
    return { data: points, trend: t };
  }, [bundle]);
  return <WeeklyRevenueChart data={data} trend={trend} />;
}

export function ActivePlatformsLive() {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { settings } = useSettings();
  const platforms = useMemo<Platform[]>(() => {
    const fleet = allRows.filter((c) => c.tenantId === activeFleetId);
    const count = (p: PlatformKey) => fleet.filter((c) => c.platforms.includes(p) && c.status === "active").length;
    return [
      { key: "bolt",  name: "Bolt Food", couriers: count("bolt"),  active: settings.platforms.bolt  === "active" },
      { key: "wolt",  name: "Wolt",      couriers: count("wolt"),  active: settings.platforms.wolt  === "active" },
      { key: "glovo", name: "Glovo",     couriers: count("glovo"), active: settings.platforms.glovo === "active" },
    ];
  }, [allRows, activeFleetId, settings.platforms]);
  return <ActivePlatformsCard platforms={platforms} />;
}

export function ExpiringDocumentsLive() {
  const { fleetDocuments } = useDocuments();
  const docs = useMemo<ExpiringDocument[]>(() => {
    const now = new Date("2026-09-10").getTime();
    const groups = new Map<string, { count: number; minDays: number }>();
    for (const d of fleetDocuments) {
      if (!d.expiryIso) continue;
      const days = Math.round((new Date(d.expiryIso).getTime() - now) / 86400000);
      if (days < 0 || days > 30) continue;
      const col = columnForType(d.type);
      const g = groups.get(col) ?? { count: 0, minDays: 999 };
      g.count += 1; g.minDays = Math.min(g.minDays, days);
      groups.set(col, g);
    }
    const labelFor = (col: string) => DOC_COLUMNS.find((c) => c.key === col)?.label ?? col;
    return Array.from(groups.entries()).map(([col, g]) => ({ id: `exp_${col}`, label: labelFor(col).toLowerCase(), count: g.count, daysUntil: g.minDays, category: "other" as const }));
  }, [fleetDocuments]);
  return <ExpiringDocumentsCard docs={docs} />;
}

export function RecentActivityLive() {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();
  const accounts = useAccountDirectory();

  const value = useMemo(() => {
    const fleet = allRows.filter((c) => c.tenantId === activeFleetId);
    const couriers: RecentCourier[] = [...fleet].sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1)).slice(0, 5).map((c) => ({ id: c.id, name: c.fullName, phone: c.phone, city: c.city, platform: c.platforms[0] ?? "bolt", status: c.status, pendingDays: pendingDays(c), registeredAt: c.createdAtIso.slice(0, 10), avatarUrl: null, owner: accounts.size > 0 ? courierOwner(c, accounts) : undefined }));

    const payMethod = (m: string): RecentPayment["method"] => m === "cash" ? "cash" : m === "bank_transfer" ? "transfer" : "card";
    const payStatus = (s: string): RecentPayment["status"] => s === "paid" ? "platit" : (s === "unpaid" || s === "issue" || s === "blocked") ? "esuat" : "pending";
    const payments: RecentPayment[] = [...fleetPayments].filter((p) => p.paidAtIso).sort((a, b) => ((a.paidAtIso ?? "") < (b.paidAtIso ?? "") ? 1 : -1)).slice(0, 5).map((p) => ({ id: p.id, courierName: p.recipient.name, amount: p.totalCalculated, method: payMethod(p.method), status: payStatus(p.status), paidAt: (p.paidAtIso ?? p.paymentDateIso).slice(0, 10) }));

    const tickets = buildTickets(fleet);
    const sev = (p: string): RecentIssue["severity"] => p === "urgent" ? "high" : p === "high" ? "medium" : "low";
    const issues: RecentIssue[] = tickets.slice(0, 5).map((t) => ({ id: t.id, title: t.subject, severity: sev(t.priority), courierName: t.requesterName, createdAt: t.createdIso.slice(0, 10) }));

    return { couriers, payments, issues };
  }, [allRows, activeFleetId, fleetPayments, accounts]);

  return <RecentActivityTabs couriers={value.couriers} payments={value.payments} issues={value.issues} />;
}

const STATIC_TASKS = [
  { id: "t1", title: "Sună curieri noi", due: "azi", done: false },
  { id: "t2", title: "Verifică documente expirate", due: "azi", done: false },
  { id: "t3", title: "Pregătește plățile săptămânale", due: "maine", done: false },
  { id: "t4", title: "Follow-up cu subcontractori", due: "maine", done: false },
  { id: "t5", title: "Rezolvă problemele deschise", due: "vineri", done: false },
];
export function UpcomingTasksLive() {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const tasks = useMemo<UpcomingTask[]>(() => {
    const stuck = allRows
      .filter((c) => c.tenantId === activeFleetId)
      .map((c) => ({ c, days: pendingDays(c) }))
      .filter((x): x is { c: typeof x.c; days: number } => x.days !== null && x.days >= PENDING_ALERT_DAYS)
      .sort((a, b) => b.days - a.days);
    const top = stuck.slice(0, 3).map(({ c, days }) => ({ id: `stuck_${c.id}`, title: `Urmărește ${c.fullName} — ${COURIER_STATUS_LABEL[c.status].toLowerCase()} de ${days} zile`, due: "azi", done: false }));
    const rest = stuck.length > 3 ? [{ id: "stuck_rest", title: `Încă ${stuck.length - 3} curieri pending de peste ${PENDING_ALERT_DAYS} zile`, due: "azi", done: false }] : [];
    return [...top, ...rest, ...STATIC_TASKS];
  }, [allRows, activeFleetId]);
  return <UpcomingTasksCard tasks={tasks} />;
}

