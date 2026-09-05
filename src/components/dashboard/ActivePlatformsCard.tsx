import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import type { Platform } from "@/lib/dashboard/types";

export function ActivePlatformsCard({ platforms }: { platforms: Platform[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platforme active</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {platforms.map((p) => (
          <div
            key={p.key}
            className="flex items-center gap-3 rounded-lg border border-line/70 bg-card-2/60 p-3"
          >
            <PlatformLogo platform={p.key} size={40} rounded="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-fg">{p.name}</div>
              <div className="text-[11.5px] text-fg-muted">
                {p.couriers} curieri
              </div>
            </div>
            {p.active && <Badge tone="success">Activ</Badge>}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
