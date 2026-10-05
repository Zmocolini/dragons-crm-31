import { NextResponse } from "next/server";
import { findPendingByToken } from "@/lib/auth/invitations";

/** GET — public: starea invitației pentru pagina /invite (fără date sensibile). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { row, status } = await findPendingByToken((await params).token);
  if (!row) return NextResponse.json({ status: "missing" }, { status: 404 });
  return NextResponse.json({ status, email: row.email, name: row.name });
}
