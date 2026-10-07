import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";
import { SubcontractorsPage } from "@/components/subcontractors/SubcontractorsPage";

export default async function SubcontractoriPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  // Secțiune doar pentru admin: subcontractorii nu au subcontractori (nici prin URL direct).
  const user = await getSessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "global_owner") redirect("/");
  const { view } = await searchParams;
  return <SubcontractorsPage initialView={view === "contracte" ? "contracts" : "list"} />;
}
