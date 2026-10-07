import type { CrmDocument } from "@/lib/documents/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { Payment } from "@/lib/payments/types";
import type { CourierRow } from "./mock-seed";
import { INCOMPLETE_FIELD_LABEL } from "./types";

/**
 * Vederea „Pe echipe": fiecare curier cade în EXACT o găleată (suma găleților = total echipă).
 * Prioritate: eroare > de activat > pending > ok; pauză/oprit/respins sunt separat, nu sunt probleme.
 * Motivele (reasons) se afișează toate, chiar dacă găleata e decisă de primul.
 */
export type TeamBucket = "error" | "to_activate" | "pending" | "ok" | "inactive";

export const TEAM_BUCKETS: TeamBucket[] = ["error", "to_activate", "pending", "ok", "inactive"];

export const TEAM_BUCKET_LABEL: Record<TeamBucket, string> = {
  error: "Eroare",
  to_activate: "De activat",
  // Nu e statusul `pending` (acela e „De activat"): aici curierul așteaptă loc pe o platformă sau verificarea actelor.
  pending: "Așteaptă loc / acte",
  ok: "În regulă",
  inactive: "Inactiv / respins",
};

// Aceleași nume ca în CouriersWaitingPanel; duplicat aici ca modulul să rămână pur (fără React) și testabil.
const PLATFORM_LABEL: Record<PlatformKey, string> = { bolt: "Bolt Food", wolt: "Wolt", glovo: "Glovo" };

export type ClassifyInput = { docs: CrmDocument[]; payments: Payment[]; todayMs: number };
export type Classified = { bucket: TeamBucket; reasons: string[] };

/** Ultimul document pe fiecare tip: un permis expirat înlocuit cu unul valid nu mai e eroare. */
function latestPerType(docs: CrmDocument[]): CrmDocument[] {
  const byType = new Map<string, CrmDocument>();
  for (const d of docs) {
    const cur = byType.get(d.type);
    if (!cur || d.createdAtIso > cur.createdAtIso) byType.set(d.type, d);
  }
  return [...byType.values()];
}

export function classifyCourier(row: CourierRow, { docs, payments, todayMs }: ClassifyInput): Classified {
  if (row.status === "paused" || row.status === "stopped" || row.status === "rejected") return { bucket: "inactive", reasons: [] };

  const errors: string[] = [];
  const pending: string[] = [];
  const latest = latestPerType(docs);

  if (latest.some((d) => d.status === "expired" || (d.expiryIso != null && Date.parse(d.expiryIso) < todayMs))) {
    errors.push("Document expirat");
  }
  if (latest.some((d) => d.status === "rejected")) errors.push("Document respins");
  if (payments.some((p) => p.status === "blocked")) errors.push("Plată blocată");
  if (payments.some((p) => p.status === "issue")) errors.push("Problemă la plată");

  const missing = Array.isArray(row.incompleteFields) ? row.incompleteFields : [];
  if (row.status === "in_activation" && missing.length > 0) {
    errors.push(`Activare blocată: lipsește ${missing.map((k) => INCOMPLETE_FIELD_LABEL[k]).join(", ")}`);
  }

  if (latest.some((d) => d.status === "in_review")) pending.push("Documente în verificare");
  for (const p of row.waitlistedPlatforms ?? []) pending.push(`Așteaptă ${PLATFORM_LABEL[p]}`);

  // pending = înregistrat de subcontractor, așteaptă ca flota să-l confirme (activează / respinge).
  const toActivate = row.status === "in_activation" || row.status === "draft" || row.status === "pending";
  const extra = [
    ...(row.status === "pending" ? ["Așteaptă confirmarea flotei"] : []),
    ...(toActivate && row.status !== "pending" && docs.length === 0 ? ["Fără documente încărcate"] : []),
  ];
  const reasons = [...errors, ...extra, ...pending];

  const bucket: TeamBucket = errors.length ? "error" : toActivate ? "to_activate" : pending.length ? "pending" : "ok";
  return { bucket, reasons };
}

export type TeamId = { key: string; label: string; kind: "internal" | "subcontractor" };
export type TeamMember = { row: CourierRow; reasons: string[] };
export type Team = TeamId & {
  total: number;
  counts: Record<TeamBucket, number>;
  members: Record<TeamBucket, TeamMember[]>;
};

function emptyTeam(id: TeamId): Team {
  const counts = {} as Record<TeamBucket, number>;
  const members = {} as Record<TeamBucket, TeamMember[]>;
  for (const b of TEAM_BUCKETS) { counts[b] = 0; members[b] = []; }
  return { ...id, total: 0, counts, members };
}

/**
 * `extraTeams` = echipe fără curieri încă (ex. subcontractori noi): apar cu 0, nu dispar din vedere.
 * Ordinea: cele cu cele mai multe erori întâi, apoi de activat, apoi pending, apoi alfabetic.
 */
export function buildTeams(
  rows: CourierRow[],
  teamOf: (row: CourierRow) => TeamId,
  inputOf: (row: CourierRow) => ClassifyInput,
  extraTeams: TeamId[] = [],
): Team[] {
  const teams = new Map<string, Team>();
  for (const id of extraTeams) teams.set(id.key, emptyTeam(id));
  for (const row of rows) {
    const id = teamOf(row);
    let team = teams.get(id.key);
    if (!team) { team = emptyTeam(id); teams.set(id.key, team); }
    const { bucket, reasons } = classifyCourier(row, inputOf(row));
    team.total++;
    team.counts[bucket]++;
    team.members[bucket].push({ row, reasons });
  }
  return [...teams.values()].sort(
    (a, b) =>
      b.counts.error - a.counts.error ||
      b.counts.to_activate - a.counts.to_activate ||
      b.counts.pending - a.counts.pending ||
      a.label.localeCompare(b.label, "ro"),
  );
}
