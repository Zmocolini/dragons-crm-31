import { WaitlistPage } from "./WaitlistPage";

// TODO(real-users): înlocuiește cu await getServerSession() + Drizzle query
// (SELECT * FROM couriers WHERE tenant_id = $1 AND jsonb_array_length(waitlisted_platforms) > 0).
export default function CouriersWaitlistRoute() {
  return <WaitlistPage />;
}
