import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  completeStudentLoginInvite,
  previewStudentLoginInvite,
} from "@/lib/services/student-login-invite";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const preview = await previewStudentLoginInvite(token);
  if (!preview) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  if (preview.alreadyActive) {
    return NextResponse.json({ ...preview, canComplete: false });
  }
  if (preview.used || preview.expired) {
    return NextResponse.json({ ...preview, canComplete: false });
  }

  return NextResponse.json({ ...preview, canComplete: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  const passwordConfirm = String(body.passwordConfirm ?? "");
  const confirmName = Boolean(body.confirmName);

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const result = await completeStudentLoginInvite({ token, password, confirmName });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const sessionToken = await signSessionToken({
    userId: result.userId,
    role: "STUDENT",
    schoolId: result.schoolId,
    studentId: result.studentId,
  });

  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, opts);

  const res = NextResponse.json({
    ok: true,
    email: result.email,
    redirect: "/student",
  });
  res.cookies.set(SESSION_COOKIE, sessionToken, opts);
  return res;
}
