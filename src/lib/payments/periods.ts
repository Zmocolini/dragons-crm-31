// Helpers pentru calculul, formatarea și gruparea săptămânilor de plată (ISO 8601: Luni - Duminică).
import { type Payment, type PaymentSourceDetail, paymentSourceDetail } from "./types";

const RO_MONTHS_SHORT = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
  "Iul", "Aug", "Sep", "Oct", "Noi", "Dec",
];

const RO_MONTHS_FULL = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export type WeekInterval = {
  startIso: string;      // YYYY-MM-DD (Luni)
  endIso: string;        // YYYY-MM-DD (Duminică)
  weekNumber: number;    // ex: 38
  year: number;          // ex: 2026
  label: string;         // ex: "15 – 21 Sep 2026"
  shortBadge: string;    // ex: "S38 (15 – 21 Sep)"
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Calculează numărul săptămânii ISO (1 - 53). */
export function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Returnează intervalul Luni - Duminică pentru o dată dată (sau azi). */
export function getWeekInterval(refDate: Date | string = new Date()): WeekInterval {
  const d = typeof refDate === "string" ? parseIsoDate(refDate) : new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Luni = 0 ... Duminică = 6
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startIso = toIsoDate(monday);
  const endIso = toIsoDate(sunday);
  const weekNumber = getIsoWeekNumber(monday);
  const year = monday.getFullYear();

  const label = formatWeekRange(startIso, endIso);
  const shortBadge = `S${weekNumber} (${label.replace(/ \d{4}$/, "")})`;

  return { startIso, endIso, weekNumber, year, label, shortBadge };
}

/** Returnează intervalul săptămânii ANTERIOARE celei date (de regulă săptămâna de raport). */
export function getPreviousWeekInterval(refDate: Date | string = new Date()): WeekInterval {
  const current = getWeekInterval(refDate);
  const prevDate = parseIsoDate(current.startIso);
  prevDate.setDate(prevDate.getDate() - 7);
  return getWeekInterval(prevDate);
}

/** Formatează frumos intervalul: ex. "15 – 21 Sep 2026" sau "28 Aug – 03 Sep 2026". */
export function formatWeekRange(startIso: string, endIso: string): string {
  if (!startIso) return "";
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = (endIso || startIso).split("-").map(Number);

  const startMonth = RO_MONTHS_SHORT[(sm || 1) - 1];
  const endMonth = RO_MONTHS_SHORT[(em || 1) - 1];

  if (sy === ey && sm === em) {
    return `${pad(sd)} – ${pad(ed)} ${endMonth} ${ey}`;
  }
  if (sy === ey) {
    return `${pad(sd)} ${startMonth} – ${pad(ed)} ${endMonth} ${ey}`;
  }
  return `${pad(sd)} ${startMonth} ${sy} – ${pad(ed)} ${endMonth} ${ey}`;
}

export type WoltCycle = {
  cycleNumber: 1 | 2 | 3 | 4;
  startIso: string;
  endIso: string;
  invoiceDateIso: string;
  label: string;         // ex: "01 – 07 Sep 2026 (Autofactură pe 8)"
  shortBadge: string;    // ex: "Wolt C1 (01 – 07 Sep)"
};

export type WeekOption = WeekInterval & {
  key: string;                          // Cheie unică pentru selector/navigare (ex: "2026-09-22__ttg_bolt")
  sourceDetail: PaymentSourceDetail | "all";
  reportName: string;                    // "Raport TTG Bolt", "Raport Gusty Bolt", "Cumulat (TTG + Gusty)"
  displayTitle: string;                  // "Raport TTG Bolt (22 – 28 Sep)"
  dropdownLabel: string;                 // "Raport TTG Bolt · 22 – 28 Sep 2026 (50 plăți · 30.000 RON)"
  count: number;
  totalCalculated: number;
  isCurrent: boolean;
  hasTtg: boolean;
  hasGusty?: boolean;
  hasWolt?: boolean;
  woltCycle?: WoltCycle | null;
};

/** Generează cele 4 cicluri Wolt de autofacturare pentru o lună dată. */
export function getWoltCyclesForMonth(year: number, month: number): WoltCycle[] {
  const mStr = pad(month);
  const mName = RO_MONTHS_SHORT[month - 1];
  const lastDay = new Date(year, month, 0).getDate();

  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextMonthInvoice = `${nextMonthYear}-${pad(nextMonthNum)}-01`;

  return [
    {
      cycleNumber: 1,
      startIso: `${year}-${mStr}-01`,
      endIso: `${year}-${mStr}-07`,
      invoiceDateIso: `${year}-${mStr}-08`,
      label: `01 – 07 ${mName} ${year} (Autofactură pe 8)`,
      shortBadge: `C1: 01 – 07 ${mName}`,
    },
    {
      cycleNumber: 2,
      startIso: `${year}-${mStr}-08`,
      endIso: `${year}-${mStr}-15`,
      invoiceDateIso: `${year}-${mStr}-16`,
      label: `08 – 15 ${mName} ${year} (Autofactură pe 16)`,
      shortBadge: `C2: 08 – 15 ${mName}`,
    },
    {
      cycleNumber: 3,
      startIso: `${year}-${mStr}-16`,
      endIso: `${year}-${mStr}-22`,
      invoiceDateIso: `${year}-${mStr}-23`,
      label: `16 – 22 ${mName} ${year} (Autofactură pe 23)`,
      shortBadge: `C3: 16 – 22 ${mName}`,
    },
    {
      cycleNumber: 4,
      startIso: `${year}-${mStr}-23`,
      endIso: `${year}-${mStr}-${pad(lastDay)}`,
      invoiceDateIso: nextMonthInvoice,
      label: `23 – ${pad(lastDay)} ${mName} ${year} (Autofactură pe 1)`,
      shortBadge: `C4: 23 – ${pad(lastDay)} ${mName}`,
    },
  ];
}

/** Returnează ciclul Wolt cel mai recent încheiat (pentru care s-a emis autofactura) și ciclul curent. */
export function getRecentWoltCycles(refDate: Date | string = new Date()): {
  completedCycle: WoltCycle;
  currentCycle: WoltCycle;
  allCycles: WoltCycle[];
} {
  const d = typeof refDate === "string" ? parseIsoDate(refDate) : new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const prevMonthYear = month === 1 ? year - 1 : year;
  const prevMonthNum = month === 1 ? 12 : month - 1;

  const currentMonthCycles = getWoltCyclesForMonth(year, month);
  const prevMonthCycles = getWoltCyclesForMonth(prevMonthYear, prevMonthNum);

  let completedCycle: WoltCycle;
  let currentCycle: WoltCycle;

  if (day < 8) {
    // 1-7 ale lunii: s-a emis autofactura pe 1 pentru C4 din luna trecută
    completedCycle = prevMonthCycles[3];
    currentCycle = currentMonthCycles[0];
  } else if (day < 16) {
    // 8-15 ale lunii: s-a emis autofactura pe 8 pentru C1
    completedCycle = currentMonthCycles[0];
    currentCycle = currentMonthCycles[1];
  } else if (day < 23) {
    // 16-22 ale lunii: s-a emis autofactura pe 16 pentru C2
    completedCycle = currentMonthCycles[1];
    currentCycle = currentMonthCycles[2];
  } else {
    // După 23: s-a emis autofactura pe 23 pentru C3
    completedCycle = currentMonthCycles[2];
    currentCycle = currentMonthCycles[3];
  }

  // Lista ultimelor cicluri disponibile
  const allCycles = [...currentMonthCycles, ...prevMonthCycles];
  return { completedCycle, currentCycle, allCycles };
}

/** Detectează dacă un interval startIso-endIso corespunde unui ciclu Wolt. */
export function matchWoltCycle(startIso: string, endIso: string): WoltCycle | null {
  if (!startIso || !endIso) return null;
  const [y, m] = startIso.split("-").map(Number);
  const cycles = getWoltCyclesForMonth(y, m);
  return cycles.find((c) => c.startIso === startIso && c.endIso === endIso) ?? null;
}

/** Extrage și grupează toate săptămânile și rapoartele distincte din lista de plăți, sortate descrescător. */
export function extractWeeksFromPayments(payments: Payment[]): WeekOption[] {
  const currentInterval = getWeekInterval();

  // Excludem plățile sintetice (placeholder-e generate temporar cu 0 RON) ca să nu polueze lista de rapoarte
  const realPayments = payments.filter((p) => !p.id.startsWith("synthetic_"));

  if (realPayments.length === 0) {
    const rangeLabel = formatWeekRange(currentInterval.startIso, currentInterval.endIso);
    return [{
      key: `${currentInterval.startIso}__all`,
      startIso: currentInterval.startIso,
      endIso: currentInterval.endIso,
      weekNumber: currentInterval.weekNumber,
      year: currentInterval.year,
      sourceDetail: "all",
      reportName: "Săptămâna curentă",
      label: rangeLabel,
      displayTitle: `Săptămâna curentă (${rangeLabel.replace(/ \d{4}$/, "")})`,
      dropdownLabel: `Săptămâna curentă · ${rangeLabel} (0 plăți)`,
      shortBadge: `S${currentInterval.weekNumber}`,
      count: 0,
      totalCalculated: 0,
      isCurrent: true,
      hasTtg: false,
      hasGusty: false,
      hasWolt: false,
      woltCycle: null,
    }];
  }

  type SourceData = { endIso: string; count: number; totalCalculated: number };
  type WeekGroup = {
    maxEndIso: string;
    sources: Map<PaymentSourceDetail, SourceData>;
  };

  const weekGroups = new Map<string, WeekGroup>();

  for (const p of realPayments) {
    const s = p.periodStartIso;
    if (!s) continue;

    const source = paymentSourceDetail(p.reference);
    const end = p.periodEndIso || s;
    const amount = Math.max(0, p.totalCalculated);

    let wg = weekGroups.get(s);
    if (!wg) {
      wg = { maxEndIso: end, sources: new Map() };
      weekGroups.set(s, wg);
    }
    if (end > wg.maxEndIso) wg.maxEndIso = end;

    let sd = wg.sources.get(source);
    if (!sd) {
      sd = { endIso: end, count: 0, totalCalculated: 0 };
      wg.sources.set(source, sd);
    }
    if (end > sd.endIso) sd.endIso = end;
    sd.count++;
    sd.totalCalculated += amount;
  }

  const REPORT_LABELS: Record<PaymentSourceDetail, string> = {
    ttg_bolt:    "Raport TTG Bolt",
    gusty_bolt:  "Raport Gusty Bolt",
    gusty_wolt:  "Raport Gusty Wolt",
    gusty_glovo: "Raport Gusty Glovo",
    manual:      "Plăți Manuale",
  };

  const options: WeekOption[] = [];

  // Sortare descrescătoare după startIso
  const sortedStarts = Array.from(weekGroups.keys()).sort((a, b) => b.localeCompare(a));

  for (const startIso of sortedStarts) {
    const wg = weekGroups.get(startIso)!;
    const interval = getWeekInterval(startIso);
    const woltCycle = matchWoltCycle(startIso, wg.maxEndIso);
    const rangeLabel = formatWeekRange(startIso, wg.maxEndIso);
    const isCurrent = startIso === currentInterval.startIso;

    // Ordonare surse preferată: ttg_bolt, gusty_bolt, gusty_wolt, gusty_glovo, manual
    const preferredOrder: PaymentSourceDetail[] = ["ttg_bolt", "gusty_bolt", "gusty_wolt", "gusty_glovo", "manual"];
    const distinctSources = Array.from(wg.sources.keys()).sort(
      (a, b) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b),
    );

    // Dacă există 2+ rapoarte diferite în aceeași săptămână, adăugăm opțiunea de CUMULAT CA PRIMĂ OPȚIUNE!
    if (distinctSources.length > 1) {
      let totalCount = 0;
      let totalAmount = 0;
      let hasTtg = false;
      let hasGusty = false;
      for (const [src, data] of wg.sources.entries()) {
        totalCount += data.count;
        totalAmount += data.totalCalculated;
        if (src === "ttg_bolt") hasTtg = true;
        if (src.startsWith("gusty")) hasGusty = true;
      }
      const totalFormatted = Math.round(totalAmount * 100) / 100;
      const countLabel = `${totalCount} plăți`;
      const cumulatedName = "Cumulat (Toate platformele)";

      options.push({
        key: `${startIso}__all`,
        startIso,
        endIso: wg.maxEndIso,
        weekNumber: interval.weekNumber,
        year: interval.year,
        sourceDetail: "all",
        reportName: cumulatedName,
        label: rangeLabel,
        displayTitle: `${cumulatedName} (${rangeLabel.replace(/ \d{4}$/, "")})`,
        dropdownLabel: `📊 ${cumulatedName} · ${rangeLabel} (${countLabel} · ${totalFormatted.toLocaleString("ro-RO")} RON)`,
        shortBadge: `S${interval.weekNumber} · Cumulat`,
        count: totalCount,
        totalCalculated: totalFormatted,
        isCurrent,
        hasTtg,
        hasGusty,
        hasWolt: wg.sources.has("gusty_wolt"),
        woltCycle,
      });
    }

    // Generăm apoi intrări dedicate pentru fiecare raport individual în parte
    for (const src of distinctSources) {
      const data = wg.sources.get(src)!;
      const reportName = REPORT_LABELS[src] ?? "Raport";
      const totalFormatted = Math.round(data.totalCalculated * 100) / 100;
      const countLabel = `${data.count} ${data.count === 1 ? "plată" : "plăți"}`;

      options.push({
        key: `${startIso}__${src}`,
        startIso,
        endIso: data.endIso,
        weekNumber: interval.weekNumber,
        year: interval.year,
        sourceDetail: src,
        reportName,
        label: rangeLabel,
        displayTitle: `${reportName} (${rangeLabel.replace(/ \d{4}$/, "")})`,
        dropdownLabel: `${reportName} · ${rangeLabel} (${countLabel} · ${totalFormatted.toLocaleString("ro-RO")} RON)`,
        shortBadge: woltCycle && src === "gusty_wolt"
          ? woltCycle.shortBadge
          : `S${interval.weekNumber} · ${reportName.replace("Raport ", "")}`,
        count: data.count,
        totalCalculated: totalFormatted,
        isCurrent,
        hasTtg: src === "ttg_bolt",
        hasGusty: src.startsWith("gusty"),
        hasWolt: src === "gusty_wolt",
        woltCycle: src === "gusty_wolt" ? woltCycle : null,
      });
    }
  }

  return options;
}
