"use client";

// Execută uneltele AI Copilot peste contextele CRM (datele stau în browser, scoped pe rol/flotă).
// Orice ieșire către LLM trece fără IBAN/CNP și cu telefoane mascate — regula de confidențialitate a copilotului.

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/rbac/session";
import { useAuth } from "@/lib/auth/context";
import { useCouriers } from "@/lib/couriers/context";
import { courierOwner, useAccountDirectory } from "@/lib/couriers/use-account-directory";
import { useTeams } from "@/lib/couriers/use-teams";
import { TEAM_BUCKET_LABEL, type TeamBucket } from "@/lib/couriers/team-status";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { planActivation } from "@/lib/couriers/activation";
import { usePayments } from "@/lib/payments/context";
import { useInvoices } from "@/lib/invoices/context";
import { useDocuments } from "@/lib/documents/context";
import { useVehicles } from "@/lib/vehicles/context";
import { reportBase, vatRateFor, vatRegimeLabel } from "@/lib/invoices/vat";
import { todayIsoLocal } from "@/lib/invoices/types";
import { COURIER_STATUS_LABEL, type Courier, type CourierStatus } from "@/lib/couriers/types";
import type { PaymentStatus } from "@/lib/payments/types";
import type { PlatformKey } from "@/lib/settings/types";

type Args = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const maskPhone = (p: string) => (p.length > 4 ? `${p.slice(0, 4)}…${p.slice(-3)}` : p);
const round2 = (x: number) => Math.round(x * 100) / 100;
const PLATFORM_KEYS: PlatformKey[] = ["bolt", "wolt", "glovo"];
const platformsOf = (v: unknown): PlatformKey[] =>
  Array.isArray(v) ? v.filter((p): p is PlatformKey => PLATFORM_KEYS.includes(p as PlatformKey)) : [];

export class ToolError extends Error {}

export function useCopilotExecutor() {
  const router = useRouter();
  const { user, can, fleets, activeFleetId } = useSession();
  const { updateMyFleet } = useAuth();
  const { couriers, allRows, addCourier, updateCourier, deleteCourier, findDuplicates } = useCouriers();
  const { fleetPayments, setStatus, addNote } = usePayments();
  const { fleetInvoices, addInvoice, updateInvoice, markPaid, cancelInvoice, deleteInvoice } = useInvoices();
  const { fleetDocuments } = useDocuments();
  const { fleetVehicles } = useVehicles();

  const fleet = fleets.find((f) => f.id === activeFleetId);
  const fleetCouriers = allRows.filter((c) => c.tenantId === activeFleetId);
  const isGlobalOwner = user.role === "global_owner";
  const accounts = useAccountDirectory();
  const { scope } = useOwnerScope();
  const teams = useTeams(fleetCouriers, { accounts, isGlobalOwner, showEmptyTeams: !scope, meName: user.name });
  const teamOf = (c: (typeof fleetCouriers)[number]) => (accounts.size > 0 ? courierOwner(c, accounts).label : null);
  const need = (perm: Parameters<typeof can>[0]) => { if (!can(perm)) throw new ToolError(`Rolul tău nu are dreptul ${perm}.`); };

  const nextInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `DD-${year}-`;
    const max = fleetInvoices.filter((i) => i.number.startsWith(prefix))
      .reduce((m, i) => Math.max(m, Number(i.number.slice(prefix.length)) || 0), 0);
    return `${prefix}${String(max + 1).padStart(4, "0")}`;
  };

  const courierOut = (c: (typeof fleetCouriers)[number]) => ({
    id: c.id, name: c.fullName, phone: maskPhone(c.phone), city: c.city, platforms: c.platforms,
    status: c.status, vehicle: c.vehicleType, contract: c.collaboration, team: teamOf(c),
    incomplete: c.incompleteFields, waitingFor: c.waitlistedPlatforms ?? [],
  });

  // Recreat la fiecare randare → vede mereu starea curentă (pagina îl ține într-un ref).
  const run = async (name: string, a: Args): Promise<unknown> => {
    switch (name) {
      case "overview": {
        const by = <T extends string>(xs: T[]) => xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
        const now = Date.now();
        return {
          fleet: fleet?.name, role: user.role, vatRegime: vatRegimeLabel(fleet?.country ?? "", fleet?.vatPayer),
          couriers: { total: fleetCouriers.length, byStatus: by(fleetCouriers.map((c) => c.status)), byCity: by(fleetCouriers.map((c) => c.city)), byPlatform: by(fleetCouriers.flatMap((c) => c.platforms)) },
          payments: { total: fleetPayments.length, byStatus: by(fleetPayments.map((p) => p.status)), paidRon: round2(fleetPayments.filter((p) => p.status === "paid").reduce((x, p) => x + p.amountPaid, 0)) },
          invoices: { total: fleetInvoices.length, byStatus: by(fleetInvoices.map((i) => i.status)) },
          documentsExpiring30d: fleetDocuments.filter((d) => d.expiryIso && new Date(d.expiryIso).getTime() - now <= 30 * 864e5).length,
          vehicles: { total: fleetVehicles.length, byStatus: by(fleetVehicles.map((v) => v.status)) },
        };
      }
      case "find_couriers": {
        const q = s(a.query).toLowerCase(); const qDigits = q.replace(/\D/g, "");
        const rows = fleetCouriers.filter((c) =>
          (!q || c.fullName.toLowerCase().includes(q) || (qDigits.length >= 4 && c.phone.replace(/\D/g, "").includes(qDigits))) &&
          (!s(a.status) || c.status === a.status) &&
          (!s(a.city) || c.city.toLowerCase().includes(s(a.city).toLowerCase())) &&
          (!s(a.platform) || c.platforms.includes(a.platform as PlatformKey)));
        return { total: rows.length, couriers: rows.slice(0, n(a.limit, 20)).map(courierOut) };
      }
      case "list_payments": {
        const who = s(a.courier).toLowerCase();
        const rows = fleetPayments.filter((p) =>
          (!s(a.status) || p.status === a.status) && (!s(a.from) || p.periodStartIso >= s(a.from)) &&
          (!s(a.to) || p.periodEndIso <= s(a.to)) && (!who || p.recipient.name.toLowerCase().includes(who)));
        return {
          total: rows.length,
          payments: rows.slice(0, n(a.limit, 20)).map((p) => ({
            id: p.id, courier: p.recipient.name, period: `${p.periodStartIso}..${p.periodEndIso}`, status: p.status,
            orders: p.ordersCount ?? null, grossRon: p.breakdown.grossRevenue, netRon: p.totalCalculated, paidRon: p.amountPaid,
          })),
        };
      }
      case "report_summary": {
        const from = s(a.from), to = s(a.to);
        const rows = fleetPayments.filter((p) => p.periodStartIso >= from && p.periodEndIso <= to);
        const perCourier = new Map<string, { orders: number; gross: number }>();
        const perPlatform: Record<string, number> = {};
        for (const p of rows) {
          const c = perCourier.get(p.recipient.name) ?? { orders: 0, gross: 0 };
          c.orders += p.ordersCount ?? 0; c.gross += p.breakdown.grossRevenue; perCourier.set(p.recipient.name, c);
          for (const pl of p.platforms ?? []) perPlatform[pl] = (perPlatform[pl] ?? 0) + p.breakdown.grossRevenue;
        }
        const { base, count } = reportBase(rows, from, to);
        return {
          period: `${from}..${to}`, payments: rows.length, couriers: perCourier.size,
          orders: rows.reduce((x, p) => x + (p.ordersCount ?? 0), 0),
          grossRon: round2(rows.reduce((x, p) => x + p.breakdown.grossRevenue, 0)),
          netRon: round2(rows.reduce((x, p) => x + p.totalCalculated, 0)),
          paid: { count, ron: base }, unpaidCount: rows.filter((p) => p.status !== "paid").length,
          grossByPlatform: Object.fromEntries(Object.entries(perPlatform).map(([k, v]) => [k, round2(v)])),
          topCouriers: [...perCourier.entries()].sort((x, y) => y[1].orders - x[1].orders).slice(0, 10)
            .map(([name, v]) => ({ name, orders: v.orders, grossRon: round2(v.gross) })),
        };
      }
      case "list_invoices":
        return fleetInvoices.filter((i) => (!s(a.status) || i.status === a.status) && (!s(a.direction) || i.direction === a.direction))
          .slice(0, 30).map((i) => ({ id: i.id, number: i.number, direction: i.direction, counterparty: i.counterpartyName, baseRon: i.baseRon, vatPct: i.vatPct, totalRon: i.totalRon, status: i.status, issue: i.issueDateIso, due: i.dueDateIso }));
      case "list_expiring_documents": {
        const limit = Date.now() + n(a.days, 30) * 864e5;
        return fleetDocuments.filter((d) => d.expiryIso && new Date(d.expiryIso).getTime() <= limit)
          .sort((x, y) => (x.expiryIso ?? "").localeCompare(y.expiryIso ?? ""))
          .slice(0, 40).map((d) => ({ id: d.id, subject: d.subject.name, type: d.type, status: d.status, expires: d.expiryIso }));
      }
      case "list_vehicles":
        return fleetVehicles.slice(0, 40).map((v) => ({ id: v.id, label: v.label, type: v.type, brand: v.brand, model: v.model, status: v.status, itp: v.itpExpiryIso, insurance: v.insuranceExpiryIso }));
      case "navigate": {
        const path = s(a.path);
        if (!path.startsWith("/")) throw new ToolError("Rută invalidă.");
        router.push(path);
        return { opened: path };
      }

      case "create_courier": {
        need("couriers.create");
        const fullName = s(a.fullName), phone = s(a.phone), email = s(a.email) || null;
        if (!fullName) throw new ToolError("Numele e obligatoriu.");
        if (s(a.status) && !(s(a.status) in COURIER_STATUS_LABEL)) throw new ToolError(`Status necunoscut: ${s(a.status)}.`);
        const dup = findDuplicates(phone, email);
        if (dup.length) return { created: false, reason: "duplicat", matches: dup.slice(0, 3) };
        const platforms = platformsOf(a.platforms);
        const incomplete = ([["phone", phone], ["email", email], ["platforms", platforms.length ? "x" : ""]] as const)
          .filter(([, v]) => !v).map(([k]) => k);
        const c = addCourier({
          fullName, phone, email, city: s(a.city), platforms,
          nationality: (s(a.nationality) || "ro") as Courier["nationality"],
          vehicleType: (s(a.vehicleType) || "scooter") as Courier["vehicleType"],
          vehicleOwnership: (s(a.vehicleOwnership) || "own") as Courier["vehicleOwnership"],
          collaboration: (s(a.collaboration) || "collaboration") as Courier["collaboration"],
          status: (s(a.status) || "in_activation") as CourierStatus,
          incompleteFields: incomplete,
          // Filtrarea pe subcontractor compară createdBy cu emailul (couriers/context.tsx).
          createdBy: user.email, tenantId: activeFleetId,
        });
        return { created: true, id: c.id, name: c.fullName, missing: incomplete };
      }
      case "update_courier": {
        need("couriers.edit");
        const id = s(a.id);
        if (!fleetCouriers.some((c) => c.id === id)) throw new ToolError("Curier inexistent în flota ta.");
        if (!couriers.some((c) => c.id === id)) throw new ToolError("Curierul vine din date demo (seed) și nu poate fi editat; editează doar curierii înregistrați.");
        const p = (a.patch ?? {}) as Args;
        // Contextul ignoră tăcut statusul trimis de un subcontractor — nu raportăm „modificat" fals.
        if (s(p.status) && !isGlobalOwner) throw new ToolError("Statusul curierului îl schimbă doar flota (Global Owner).");
        if (s(p.status) && !(s(p.status) in COURIER_STATUS_LABEL)) throw new ToolError(`Status necunoscut: ${s(p.status)}.`);
        const patch: Partial<Courier> = {};
        for (const k of ["fullName", "phone", "email", "city", "status", "vehicleType", "collaboration"] as const) if (s(p[k])) (patch as Args)[k] = s(p[k]);
        for (const k of ["commissionPct", "weeklyContractFeeRon"] as const) if (typeof p[k] === "number") patch[k] = p[k] as number;
        if (Array.isArray(p.platforms)) patch.platforms = platformsOf(p.platforms);
        if (!Object.keys(patch).length) throw new ToolError("Nimic de modificat.");
        updateCourier(id, patch);
        return { updated: true, id, fields: Object.keys(patch) };
      }
      case "delete_courier": {
        need("couriers.edit");
        const id = s(a.id);
        if (!fleetCouriers.some((c) => c.id === id)) throw new ToolError("Curier inexistent în flota ta.");
        deleteCourier(id);
        return { deleted: true, id };
      }
      case "set_payment_status": {
        need("payments.create");
        const id = s(a.id);
        if (!fleetPayments.some((p) => p.id === id)) throw new ToolError("Plată inexistentă în flota ta.");
        setStatus(id, s(a.status) as PaymentStatus, user.name, s(a.reason) || "AI Copilot");
        return { updated: true, id, status: a.status };
      }
      case "add_payment_note": {
        need("payments.create");
        const id = s(a.id);
        if (!fleetPayments.some((p) => p.id === id)) throw new ToolError("Plată inexistentă în flota ta.");
        addNote(id, s(a.text), user.name);
        return { added: true };
      }
      case "create_invoice":
      case "create_invoice_from_report": {
        need("payments.create");
        const fromReport = name === "create_invoice_from_report";
        const { base, count } = fromReport ? reportBase(fleetPayments, s(a.from), s(a.to)) : { base: n(a.baseRon, 0), count: 0 };
        if (base <= 0) throw new ToolError(fromReport ? "Nu există plăți achitate în perioada aleasă." : "Baza trebuie să fie > 0.");
        const inv = addInvoice({
          tenantId: activeFleetId,
          direction: fromReport ? "issued" : (s(a.direction) === "received" ? "received" : "issued"),
          number: s(a.number) || nextInvoiceNumber(),
          issueDateIso: s(a.issueDate) || todayIsoLocal(), dueDateIso: s(a.dueDate) || null,
          counterpartyName: fromReport ? (fleet?.name ?? "") : s(a.counterpartyName),
          counterpartyCui: fromReport ? (fleet?.cui || null) : (s(a.counterpartyCui) || null),
          baseRon: base,
          vatPct: typeof a.vatPct === "number" ? a.vatPct : vatRateFor(fleet?.country ?? "", fleet?.vatPayer),
          notes: fromReport ? `Raport ${s(a.from)} – ${s(a.to)}: ${count} plăți` : (s(a.notes) || null),
        }, user.name);
        return { created: true, id: inv.id, number: inv.number, baseRon: inv.baseRon, vatPct: inv.vatPct, totalRon: inv.totalRon, status: inv.status };
      }
      case "set_invoice_status": {
        need("payments.create");
        const id = s(a.id);
        if (!fleetInvoices.some((i) => i.id === id)) throw new ToolError("Factură inexistentă în flota ta.");
        const act = s(a.action);
        if (act === "paid") markPaid(id); else if (act === "sent") updateInvoice(id, { status: "sent" });
        else if (act === "cancel") cancelInvoice(id); else if (act === "delete") deleteInvoice(id);
        else throw new ToolError("Acțiune necunoscută.");
        return { done: act, id };
      }
      case "set_vat_regime": {
        const md = a.country === "MD";
        updateMyFleet({ country: md ? "Moldova" : "România", vatPayer: a.vatPayer === true });
        return { regime: vatRegimeLabel(md ? "Moldova" : "România", a.vatPayer === true) };
      }
      case "create_ticket": {
        const res = await fetch("/api/tickets", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ subject: s(a.subject), body: s(a.body), priority: s(a.priority) || "normal", category: s(a.category) || "admin" }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new ToolError(j.error ?? `Eroare ${res.status}`);
        return { created: true, id: j.ticket?.id ?? j.id ?? null };
      }
      case "team_overview": {
        if (!teams) throw new ToolError("Echipele încă se încarcă — reîncearcă într-o secundă.");
        const wantTeam = s(a.team).toLowerCase();
        const bucket = s(a.bucket) as TeamBucket | "";
        const picked = wantTeam ? teams.filter((t) => t.label.toLowerCase().includes(wantTeam)) : teams;
        if (wantTeam && picked.length === 0) throw new ToolError(`Nicio echipă „${s(a.team)}”. Echipe: ${teams.map((t) => t.label).join(", ")}.`);
        const detail = Boolean(wantTeam || bucket);
        return {
          legend: TEAM_BUCKET_LABEL,
          teams: picked.map((t) => ({
            team: t.label, kind: t.kind, total: t.total, counts: t.counts,
            ...(detail ? {
              couriers: (bucket ? [bucket] : (["error", "to_activate", "pending"] as TeamBucket[]))
                .flatMap((b) => t.members[b].map((m) => ({ id: m.row.id, name: m.row.fullName, city: m.row.city, status: m.row.status, bucket: b, reasons: m.reasons, waitingFor: m.row.waitlistedPlatforms ?? [] })))
                .slice(0, 60),
            } : {}),
          })),
        };
      }
      case "activate_couriers":
      case "reject_couriers": {
        need("couriers.edit");
        const ids = Array.isArray(a.ids) ? a.ids.map(s).filter(Boolean) : [];
        if (ids.length === 0) throw new ToolError("Lipsesc id-urile curierilor.");
        const platform = s(a.platform) as PlatformKey | "";
        if (platform && !PLATFORM_KEYS.includes(platform)) throw new ToolError(`Platformă necunoscută: ${platform}.`);
        const reject = name === "reject_couriers";
        let plan;
        try {
          plan = planActivation(fleetCouriers, ids, {
            action: reject ? "reject" : "activate", platform: platform || undefined, isGlobalOwner,
            editable: (id) => couriers.some((x) => x.id === id),
          });
        } catch (e) { throw new ToolError((e as Error).message); }
        for (const { id, patch } of plan.patches) updateCourier(id, patch);
        return { [reject ? "rejected" : "activated"]: plan.done, skipped: plan.skipped, ...(reject && s(a.reason) ? { reason: s(a.reason) } : {}), ...(platform ? { platform } : {}) };
      }
      case "remove_from_waitlist": {
        need("couriers.edit");
        const id = s(a.id); const platform = s(a.platform) as PlatformKey;
        const c = fleetCouriers.find((x) => x.id === id);
        if (!c) throw new ToolError("Curier inexistent în flota ta.");
        if (!(c.waitlistedPlatforms ?? []).includes(platform)) throw new ToolError(`${c.fullName} nu așteaptă loc pe ${platform}.`);
        updateCourier(id, { waitlistedPlatforms: (c.waitlistedPlatforms ?? []).filter((p) => p !== platform) });
        return { removed: true, id, name: c.fullName, platform };
      }
      default:
        throw new ToolError(`Unealtă necunoscută: ${name}`);
    }
  };

  return { run, fleetName: fleet?.name ?? "", fleetCouriers };
}
