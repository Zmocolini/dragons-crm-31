import { CouriersPage } from "./CouriersPage";

// TODO(real-users): înlocuiește cu await getServerSession() + Drizzle query
// (SELECT * FROM couriers WHERE tenant_id = session.activeTenantId + join agregat).
// Momentan datele vin din context client (localStorage + seed) — filtrat pe activeFleetId.
export default function CouriersRoute() {
  return <CouriersPage />;
}
