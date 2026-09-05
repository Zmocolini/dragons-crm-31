import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ExpiringDocument } from "@/lib/dashboard/types";

function toneForDays(days: number): { dot: string; text: string } {
  if (days <= 7) return { dot: "bg-rose-500", text: "text-rose-400" };
  if (days <= 14) return { dot: "bg-amber-500", text: "text-amber-400" };
  return { dot: "bg-sky-500", text: "text-sky-400" };
}

export function ExpiringDocumentsCard({ docs }: { docs: ExpiringDocument[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documente expiră curând</CardTitle>
        <Link
          href="/documente"
          className="text-[11.5px] font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          Vezi toate
        </Link>
      </CardHeader>
      <CardBody className="space-y-2.5">
        {docs.length === 0 && (
          <div className="rounded-lg border border-line/50 bg-card-2/40 p-3 text-center text-[12px] text-fg-muted">
            ✓ Niciun document nu expiră în următoarele 30 de zile.
          </div>
        )}
        {docs.map((d) => {
          const tone = toneForDays(d.daysUntil);
          return (
            <Link
              key={d.id}
              href={`/documente?filter=${d.category}`}
              className="group flex items-center gap-3 rounded-lg border border-line/50 bg-card-2/40 p-2.5 transition-colors hover:bg-card-hover"
            >
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone.dot}`}
              />
              <span className="flex-1 text-[12.5px] text-fg">
                <span className="font-semibold">{d.count}</span> {d.label}
              </span>
              <span
                className={`text-[11.5px] font-medium ${tone.text}`}
              >
                în {d.daysUntil} zile
              </span>
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}
