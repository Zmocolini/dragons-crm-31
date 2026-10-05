import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";
import { revokeInvitation } from "@/lib/auth/invitations";

/** DELETE /api/admin/invitations/:id — revocă invitația (linkul nu mai merge). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "global_owner") return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  await revokeInvitation((await params).id);
  return NextResponse.json({ ok: true });
}
