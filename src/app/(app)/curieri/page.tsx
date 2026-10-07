import { CouriersPage } from "./CouriersPage";

// TODO(real-users): înlocuiește cu await getServerSession() + Drizzle query
// (SELECT * FROM couriers WHERE tenant_id = session.activeTenantId + join agregat).
// Momentan datele vin din context client (localStorage + seed) — filtrat pe activeFleetId.
export default async function CouriersRoute({ searchParams }: { searchParams: Promise<{ segment?: string; sub?: string }> }) {
  const { segment, sub } = await searchParams;
  return <CouriersPage key={`${segment ?? ""}|${sub ?? ""}`} initialSegment={segment === "asteptare" ? "waiting" : "all"} initialSub={sub ?? null} />;
}
