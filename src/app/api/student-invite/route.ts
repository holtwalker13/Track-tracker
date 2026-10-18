import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  beginStudentInviteEmailVerification,
  completeStudentLoginInvite,
  previewStudentLoginInvite,
  resendStudentInviteEmailCode,
  verifyStudentInviteEmailCode,
} from "@/lib/services/student-login-invite";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { clientIpHint } from "@/lib/security/audit-log";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const preview = await previewStudentLoginInvite(token);
  if (!preview) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const resetFlow = false;
  const mode = preview.alreadyActive ? "LOGIN" : "CREATE";
  if (!preview.alreadyActive && (preview.used || preview.expired)) {
    return NextResponse.json({ ...preview, purpose: "ACCOUNT", mode, canComplete: false });
  }

  return NextResponse.json({ ...preview, purpose: "ACCOUNT", mode, canComplete: true, resetFlow });
}

export async function POST(request: Request) {
  const ip = clientIpHint(request) ?? "unknown";
  const limit = checkRateLimit(rateLimitKey("student-invite", ip), 25, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const body = await request.json();
  const token = String(body.token ?? "").trim();
  const action = String(body.action ?? "complete");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (action === "start") {
    const started = await beginStudentInviteEmailVerification(token);
    if (!started.ok) {
      return NextResponse.json({ error: started.error }, { status: started.error.includes("email") ? 400 : 503 });
    }
    return NextResponse.json({ ok: true, step: "code", email: started.email });
  }

  if (action === "resend") {
    const sent = await resendStudentInviteEmailCode(token);
    if (!sent.ok) {
      const status = sent.error.includes("roster") ? 400 : 503;
      return NextResponse.json({ error: sent.error }, { status });
    }
    return NextResponse.json({ ok: true, step: "code" });
  }

  if (action === "verify") {
    const checked = await verifyStudentInviteEmailCode(token, String(body.code ?? ""));
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    return NextResponse.json({ ok: true, step: "password" });
  }

  const password = String(body.password ?? "");
  const passwordConfirm = String(body.passwordConfirm ?? "");
  const confirmName = Boolean(body.confirmName);

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
    username: result.username,
    redirect: "/student",
  });
  res.cookies.set(SESSION_COOKIE, sessionToken, opts);
  return res;
}
