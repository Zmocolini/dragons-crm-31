"use client";

import { useMemo } from "react";
import { useCouriers } from "@/lib/couriers/context";
import { useFleetTasks } from "@/lib/tasks/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { FleetTask } from "@/lib/tasks/types";

export type SubcontractorRequestPill = {
  key: "activation" | "phone" | "vehicle" | "transfer" | "ticket";
  label: string;
  count: number;
  tone: "warn" | "info" | "purple" | "emerald";
};

export type SubcontractorRequests = {
  totalCount: number;
  activationsCount: number;
  phoneChangesCount: number;
  vehicleChangesCount: number;
  transfersCount: number;
  ticketsCount: number;
  pendingCouriers: CourierRow[];
  openTasks: FleetTask[];
  pills: SubcontractorRequestPill[];
};

export function matchesSubcontractor(
  item: { createdBy?: string | null; subcontractorName?: string | null; raisedBy?: string | null },
  sub: { email: string; name?: string },
): boolean {
  const subEmail = sub.email.toLowerCase().trim();
  const subName = (sub.name ?? "").toLowerCase().trim();
  const createdBy = (item.createdBy ?? "").toLowerCase().trim();
  const subNameField = (item.subcontractorName ?? "").toLowerCase().trim();
  const raisedBy = (item.raisedBy ?? "").toLowerCase().trim();

  if (createdBy && createdBy === subEmail) return true;
  if (subName && subNameField && subNameField === subName) return true;
  if (subName && raisedBy && raisedBy === subName) return true;

  // Cazul specific pentru Anton / conturi demo legate
  if (subEmail.includes("anton") || subName.includes("anton")) {
    if (createdBy.includes("anton") || subNameField.includes("anton") || raisedBy.includes("anton")) {
      return true;
    }
  }

  return false;
}

export function computeRequestsForSub(
  allCouriers: CourierRow[],
  allTasks: FleetTask[],
  sub: { email: string; name?: string },
): SubcontractorRequests {
  // 1. Curieri pending
  const pendingCouriers = allCouriers.filter(
    (c) => c.status === "pending" && matchesSubcontractor(c, sub),
  );

  // 2. Task-uri deschise
  const openTasks = allTasks.filter(
    (t) => t.status !== "resolved" && matchesSubcontractor(t, sub),
  );

  let activationsCount = pendingCouriers.length;
  let phoneChangesCount = 0;
  let vehicleChangesCount = 0;
  let transfersCount = 0;
  let ticketsCount = 0;

  for (const t of openTasks) {
    const text = `${t.title} ${t.details}`.toLowerCase();
    if (t.kind === "activation") {
      activationsCount += 1;
    } else if (
      t.kind === "phone_change" ||
      text.includes("numar") ||
      text.includes("număr") ||
      text.includes("telefon")
    ) {
      phoneChangesCount += 1;
    } else if (
      t.kind === "vehicle_change" ||
      text.includes("vehicul") ||
      text.includes("scuter") ||
      text.includes("masina") ||
      text.includes("mașină") ||
      text.includes("bicicleta")
    ) {
      vehicleChangesCount += 1;
    } else if (t.kind === "transfer" || text.includes("mutare")) {
      transfersCount += 1;
    } else {
      ticketsCount += 1;
    }
  }

  const totalCount =
    activationsCount +
    phoneChangesCount +
    vehicleChangesCount +
    transfersCount +
    ticketsCount;

  const pills: SubcontractorRequestPill[] = [];
  if (activationsCount > 0) {
    pills.push({
      key: "activation",
      label: `${activationsCount} ${activationsCount === 1 ? "activare curier" : "activări curieri"}`,
      count: activationsCount,
      tone: "warn",
    });
  }
  if (phoneChangesCount > 0) {
    pills.push({
      key: "phone",
      label: `${phoneChangesCount} ${phoneChangesCount === 1 ? "schimbare număr" : "schimbări număr"}`,
      count: phoneChangesCount,
      tone: "info",
    });
  }
  if (vehicleChangesCount > 0) {
    pills.push({
      key: "vehicle",
      label: `${vehicleChangesCount} ${vehicleChangesCount === 1 ? "schimbare vehicul" : "schimbări vehicul"}`,
      count: vehicleChangesCount,
      tone: "purple",
    });
  }
  if (transfersCount > 0) {
    pills.push({
      key: "transfer",
      label: `${transfersCount} ${transfersCount === 1 ? "mutare" : "mutări"}`,
      count: transfersCount,
      tone: "info",
    });
  }
  if (ticketsCount > 0) {
    pills.push({
      key: "ticket",
      label: `${ticketsCount} ${ticketsCount === 1 ? "problemă" : "probleme"}`,
      count: ticketsCount,
      tone: "warn",
    });
  }

  return {
    totalCount,
    activationsCount,
    phoneChangesCount,
    vehicleChangesCount,
    transfersCount,
    ticketsCount,
    pendingCouriers,
    openTasks,
    pills,
  };
}

export function useSubcontractorRequests(sub: { email: string; name?: string }) {
  const { allRows } = useCouriers();
  const { allTasks } = useFleetTasks();

  return useMemo(
    () => computeRequestsForSub(allRows, allTasks, sub),
    [allRows, allTasks, sub],
  );
}

export function useAllSubcontractorsRequestsSummary(
  subs: Array<{ id: string; email: string; name: string }>,
) {
  const { allRows } = useCouriers();
  const { allTasks } = useFleetTasks();

  return useMemo(() => {
    const map = new Map<string, SubcontractorRequests>();
    let totalAll = 0;

    for (const s of subs) {
      const reqs = computeRequestsForSub(allRows, allTasks, s);
      map.set(s.id, reqs);
      totalAll += reqs.totalCount;
    }

    return { map, totalAll };
  }, [allRows, allTasks, subs]);
}
