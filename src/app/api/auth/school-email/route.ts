import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { claimSchoolLoginEmail } from "@/lib/auth/school-email-claim";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = await claimSchoolLoginEmail(session.userId, String(body.email ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
