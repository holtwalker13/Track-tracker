import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  demoPasscodeMatches,
  resolveDemoAdminUser,
  resolveDemoStudentUser,
} from "@/lib/auth/demo-passcode-login";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { loginDestination } from "@/lib/auth/login-destination";
import { signSessionToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = String(body.mode ?? "");
  const passcode = String(body.passcode ?? "");
  const nextRaw = String(body.next ?? "");

  if (mode !== "admin" && mode !== "student") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (!demoPasscodeMatches(passcode)) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const user = mode === "admin" ? await resolveDemoAdminUser() : await resolveDemoStudentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "missing",
        message: `No ${mode === "admin" ? "admin" : "student"} account found in the database yet.`,
      },
      { status: 404 }
    );
  }

  const schoolId = user.coachProfile?.schoolId ?? user.studentProfile?.schoolId;
  const token = await signSessionToken({
    userId: user.id,
    role: user.role as "ADMIN" | "COACH" | "STUDENT",
    schoolId,
    studentId: user.studentProfile?.id,
  });

  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, opts);

  const redirect = loginDestination(user.role, nextRaw);
  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
