import { CouriersPage } from "./CouriersPage";

// TODO(real-users): înlocuiește cu await getServerSession() + Drizzle query
// (SELECT * FROM couriers WHERE tenant_id = session.activeTenantId + join agregat).
// Momentan datele vin din context client (localStorage + seed) — filtrat pe activeFleetId.
export default async function CouriersRoute({ searchParams }: { searchParams: Promise<{ segment?: string; sub?: string; view?: string }> }) {
  const { segment, sub, view } = await searchParams;
  return <CouriersPage key={`${segment ?? ""}|${sub ?? ""}|${view ?? ""}`} initialSegment={segment === "asteptare" ? "waiting" : segment === "de-confirmat" ? "pending" : "all"} initialSub={sub ?? null} initialView={view === "echipe" ? "teams" : "list"} />;
}
