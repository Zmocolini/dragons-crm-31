const RO_MONTHS_SHORT = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
  "Iul", "Aug", "Sep", "Oct", "Noi", "Dec",
];

const RO_MONTHS_LONG = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const RO_WEEKDAYS = [
  "Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă",
];

export function formatRoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${RO_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRoDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${RO_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${RO_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRelativeRo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1)   return "Acum";
  if (min < 60)  return `Acum ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)    return `Acum ${h} ore`;
  const days = Math.round(h / 24);
  if (days < 7)  return `Acum ${days} zile`;
  return `${d.getDate()} ${RO_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function currentTimezoneLabel(timezone: string): string {
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = dtf.formatToParts(now);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return `${timezone} (${tz})`;
  } catch {
    return timezone;
  }
}
