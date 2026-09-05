import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Platform, PlatformKey } from "@/lib/dashboard/types";

const PLATFORM_STYLE: Record<PlatformKey, { chip: string; letter: string }> = {
  bolt: {
    chip: "bg-emerald-500 text-black",
    letter: "B",
  },
  wolt: {
    chip: "bg-sky-500 text-white",
    letter: "W",
  },
  glovo: {
    chip: "bg-yellow-400 text-black",
    letter: "G",
  },
};

export function ActivePlatformsCard({ platforms }: { platforms: Platform[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platforme active</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {platforms.map((p) => {
          const s = PLATFORM_STYLE[p.key];
          return (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded-lg border border-line/70 bg-card-2/60 p-3"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-[15px] font-black shadow-sm ${s.chip}`}
              >
                {s.letter}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-fg">{p.name}</div>
                <div className="text-[11.5px] text-fg-muted">
                  {p.couriers} curieri
                </div>
              </div>
              {p.active && <Badge tone="success">Activ</Badge>}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
