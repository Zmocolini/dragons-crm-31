import { NextRequest, NextResponse } from "next/server";
import { MAX_OPS_PER_REQUEST } from "@/lib/sync/config";
import { applyOps, currentSyncUser, readRows } from "@/lib/sync/server";

export const dynamic = "force-dynamic";

/** GET /api/sync?since=<ms> — înregistrările vizibile contului curent, modificate după `since`. */
export async function GET(req: NextRequest) {
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = Number(req.nextUrl.searchParams.get("since") ?? "0");
  const now = Date.now();
  const rows = await readRows(user, Number.isFinite(since) ? since : 0);
  return NextResponse.json(
    { me: { email: user.emailLc, role: user.role }, now, rows },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST /api/sync — { ops: SyncOp[] } → aplică modificările (cu verificare de proprietar). */
export async function POST(req: NextRequest) {
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ops = Array.isArray(body?.ops) ? (body.ops as unknown[]) : null;
  if (!ops) return NextResponse.json({ error: "ops required" }, { status: 400 });
  if (ops.length > MAX_OPS_PER_REQUEST) return NextResponse.json({ error: "too many ops" }, { status: 413 });
  const { rejected } = await applyOps(user, ops);
  return NextResponse.json({ ok: true, rejected, now: Date.now() });
}
