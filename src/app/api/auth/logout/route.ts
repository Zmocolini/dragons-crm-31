import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, deleteSession } from "@/lib/auth/core";

export async function POST() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token).catch(() => {});
  c.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
