import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSessionUser, anyUserExists } from "@/lib/auth/core";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  const setupRequired = !(await anyUserExists());
  return NextResponse.json({ user, setupRequired });
}
