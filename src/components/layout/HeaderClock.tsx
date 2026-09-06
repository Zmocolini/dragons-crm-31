"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile/context";

const RO_WEEKDAYS_SHORT = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
const RO_MONTHS_SHORT = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
  "Iul", "Aug", "Sep", "Oct", "Noi", "Dec",
];

function formatTime(d: Date, timezone: string, timeFormat: "12h" | "24h") {
  try {
    const dtf = new Intl.DateTimeFormat("ro-RO", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12h",
    });
    return dtf.format(d);
  } catch {
    return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
}

function formatDate(d: Date, timezone: string) {
  try {
    // Get day-of-week and day-of-month in the user's timezone
    const dtf = new Intl.DateTimeFormat("ro-RO", {
      timeZone: timezone,
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
    const parts = dtf.formatToParts(d);
    const wd  = parts.find((p) => p.type === "weekday")?.value ?? RO_WEEKDAYS_SHORT[d.getDay()];
    const day = parts.find((p) => p.type === "day")?.value     ?? String(d.getDate()).padStart(2, "0");
    const mon = parts.find((p) => p.type === "month")?.value   ?? RO_MONTHS_SHORT[d.getMonth()];
    const label = `${wd.replace(".", "")}, ${day} ${mon.replace(".", "")}`;
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return `${RO_WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${RO_MONTHS_SHORT[d.getMonth()]}`;
  }
}

function tzOffsetLabel(timezone: string, d: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const tz = dtf.formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return tz.replace("GMT", "GMT");
  } catch {
    return "";
  }
}

export function HeaderClock() {
  const { profile } = useProfile();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // SSR/hydrate placeholder ca să nu apară mismatch
    return (
      <div className="hidden items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-1.5 md:inline-flex">
        <Clock size={14} className="text-fg-dim" />
        <div className="leading-tight">
          <div className="font-mono text-[13px] font-semibold tracking-tight text-fg">
            --:--
          </div>
          <div className="text-[10px] text-fg-dim">—</div>
        </div>
      </div>
    );
  }

  const time  = formatTime(now, profile.timezone, profile.timeFormat);
  const date  = formatDate(now, profile.timezone);
  const tz    = tzOffsetLabel(profile.timezone, now);

  return (
    <div
      className="hidden items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-1.5 md:inline-flex"
      title={`${profile.timezone}${tz ? ` · ${tz}` : ""}`}
      aria-label={`Ora curentă ${time}, ${date}`}
    >
      <Clock size={14} className="text-violet-300" />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[14px] font-semibold tracking-tight text-fg tabular-nums">
            {time}
          </span>
          {tz && (
            <span className="text-[9px] font-medium uppercase tracking-wider text-fg-dim">
              {tz}
            </span>
          )}
        </div>
        <div data-non-essential className="text-[10.5px] text-fg-dim">{date}</div>
      </div>
    </div>
  );
}
