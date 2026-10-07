"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { courierOwner, useAccountDirectory } from "@/lib/couriers/use-account-directory";
import { usePayments } from "@/lib/payments/context";
import { useDocuments } from "@/lib/documents/context";
import { useSettings } from "@/lib/settings/context";
import { getFactsBundle } from "@/lib/reports/facts";
import { useAuth } from "@/lib/auth/context";
import { useFleetTasks } from "@/lib/tasks/context";
import { rankUrgent, type FleetTask } from "@/lib/tasks/types";
import { DOC_COLUMNS, columnForType } from "@/lib/documents/rules";
import { COURIER_STATUS_LABEL, PENDING_ALERT_DAYS, pendingDays } from "@/lib/couriers/types";
import type {
  CourierActivityPoint, ExpiringDocument, Platform, PlatformKey,
  RecentCourier, RecentIssue, RecentPayment, WeeklyRevenue,
} from "@/lib/dashboard/types";
import { CourierActivityChart } from "./CourierActivityChart";
import { WeeklyRevenueChart } from "./WeeklyRevenueChart";
import { ActivePlatformsCard } from "./ActivePlatformsCard";
import { RecentActivityTabs } from "./RecentActivityTabs";
import { ExpiringDocumentsCard } from "./ExpiringDocumentsCard";
import { FleetTasksCard } from "./FleetTasksCard";

/** Lunea săptămânii (YYYY-MM-DD) — cheie sortabilă peste ani, spre deosebire de numărul săptămânii. */
function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
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

/** Un raport săptămânal = săptămâna (luni) în care cad zilele plăților importate. */
function useWeeklyReports() {
  const bundle = useFacts();
  return useMemo(() => {
    const weeks = new Map<string, { revenue: WeeklyRevenue["byPlatform"]; couriers: Record<PlatformKey, Set<string>> }>();
    for (const f of bundle.facts) {
      const key = mondayOf(f.dateIso);
      let w = weeks.get(key);
      if (!w) { w = { revenue: { bolt: 0, wolt: 0, glovo: 0, other: 0 }, couriers: { bolt: new Set(), wolt: new Set(), glovo: new Set() } }; weeks.set(key, w); }
      w.revenue[f.platform] += f.gross;
      if (f.platform !== "other") w.couriers[f.platform].add(f.courierId);
    }
    return Array.from(weeks.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12)
      .map(([startIso, w]) => ({ startIso, label: `S${isoWeek(startIso)}`, ...w }));
  }, [bundle]);
}

export function CourierActivityLive() {
  const reports = useWeeklyReports();
  const data = useMemo<CourierActivityPoint[]>(() => reports.map((r) => ({
    label: r.label, bolt: r.couriers.bolt.size, wolt: r.couriers.wolt.size, glovo: r.couriers.glovo.size,
  })), [reports]);
  return <CourierActivityChart data={data} />;
}

export function WeeklyRevenueLive() {
  const reports = useWeeklyReports();
  const weeks = useMemo<WeeklyRevenue[]>(() => reports.map((r) => {
    const byPlatform = { bolt: Math.round(r.revenue.bolt), wolt: Math.round(r.revenue.wolt), glovo: Math.round(r.revenue.glovo), other: Math.round(r.revenue.other) };
    return { label: r.label, startIso: r.startIso, byPlatform, total: byPlatform.bolt + byPlatform.wolt + byPlatform.glovo + byPlatform.other };
  }), [reports]);
  return <WeeklyRevenueChart weeks={weeks} />;
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
  const { urgent } = useFleetUrgent();

  const value = useMemo(() => {
    const fleet = allRows.filter((c) => c.tenantId === activeFleetId);
    const couriers: RecentCourier[] = [...fleet].sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1)).slice(0, 5).map((c) => ({ id: c.id, name: c.fullName, phone: c.phone, city: c.city, platform: c.platforms[0] ?? "bolt", status: c.status, pendingDays: pendingDays(c), registeredAt: c.createdAtIso.slice(0, 10), avatarUrl: null, owner: accounts.size > 0 ? courierOwner(c, accounts) : undefined }));

    const payMethod = (m: string): RecentPayment["method"] => m === "cash" ? "cash" : m === "bank_transfer" ? "transfer" : "card";
    const payStatus = (s: string): RecentPayment["status"] => s === "paid" ? "platit" : (s === "unpaid" || s === "issue" || s === "blocked") ? "esuat" : "pending";
    const payments: RecentPayment[] = [...fleetPayments].filter((p) => p.paidAtIso).sort((a, b) => ((a.paidAtIso ?? "") < (b.paidAtIso ?? "") ? 1 : -1)).slice(0, 5).map((p) => ({ id: p.id, courierName: p.recipient.name, amount: p.totalCalculated, method: payMethod(p.method), status: payStatus(p.status), paidAt: (p.paidAtIso ?? p.paymentDateIso).slice(0, 10) }));

    // Probleme = task-urile reale deschise (nu mai sunt tichete generate din seed).
    const sev = (p: FleetTask["priority"]): RecentIssue["severity"] => p === "urgent" ? "high" : p === "high" ? "medium" : "low";
    const issues: RecentIssue[] = urgent.flatMap((u) => u.source === "task" ? [u.task] : []).slice(0, 5)
      .map((t) => ({ id: t.id, title: t.title, severity: sev(t.priority), courierName: t.courierName ?? accountLabel(accounts, t.createdBy), createdAt: t.createdAtIso.slice(0, 10) }));

    return { couriers, payments, issues };
  }, [allRows, activeFleetId, fleetPayments, accounts, urgent]);

  return <RecentActivityTabs couriers={value.couriers} payments={value.payments} issues={value.issues} />;
}

/** Numele contului din createdBy (validat de server la sync); raisedBy e text liber și nu se afișează owner-ului. */
const accountLabel = (accounts: ReturnType<typeof useAccountDirectory>, email: string) =>
  accounts.get(email.toLowerCase())?.name ?? email;

/** Urgențele flotei active: task-urile deschise + curierii pending peste prag, ordonate de rankUrgent. */
function useFleetUrgent() {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { tasks } = useFleetTasks();
  return useMemo(() => {
    const fleet = allRows.filter((c) => c.tenantId === activeFleetId);
    const stuck = fleet.flatMap((c) => {
      if (c.status === "pending") {
        const days = pendingDays(c) ?? 0;
        return [{ courierId: c.id, courierName: c.fullName, statusLabel: "În așteptare activare", days }];
      }
      const days = pendingDays(c);
      return days !== null && days >= PENDING_ALERT_DAYS ? [{ courierId: c.id, courierName: c.fullName, statusLabel: COURIER_STATUS_LABEL[c.status], days }] : [];
    });
    return { fleet, urgent: rankUrgent(tasks.filter((t) => t.tenantId === activeFleetId), stuck) };
  }, [allRows, activeFleetId, tasks]);
}

export function UpcomingTasksLive() {
  const { activeFleetId } = useSession();
  const { current } = useAuth();
  const { addTask, updateTask, canCreate } = useFleetTasks();
  const accounts = useAccountDirectory();
  const { fleet, urgent } = useFleetUrgent();
  const couriers = useMemo(() => fleet.map((c) => ({ id: c.id, name: c.fullName })).sort((a, b) => a.name.localeCompare(b.name, "ro")), [fleet]);
  return (
    <FleetTasksCard
      items={urgent}
      couriers={couriers}
      isOwner={current?.role === "global_owner"}
      raisedByLabel={(t) => accountLabel(accounts, t.createdBy)}
      canCreate={canCreate}
      onAdd={(d) => addTask({ ...d, tenantId: activeFleetId })}
      onUpdate={updateTask}
    />
  );
}

