import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";
import { findUserByCredential } from "@/lib/auth/credentials-login";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  createAccountFromClassJoin,
  findClassStudentByCredential,
  identifyClassStudent,
  previewClassJoin,
} from "@/lib/services/class-join";
import { resolveClassIdFromJoinToken } from "@/lib/services/class-join-link";
import { issueEmailLoginCode, verifyEmailLoginCode } from "@/lib/auth/email-login-code";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { clientIpHint, writeAuditLog } from "@/lib/security/audit-log";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const preview = await previewClassJoin(token);
  if (!preview) return NextResponse.json({ error: "This class link is not valid." }, { status: 404 });
  return NextResponse.json(preview);
}

export async function POST(request: Request) {
  const ip = clientIpHint(request) ?? "unknown";
  const body = await request.json();
  const token = String(body.token ?? "").trim();
  const credential = String(body.credential ?? "").trim();
  const action = String(body.action ?? "identify");

  const limit = checkRateLimit(rateLimitKey("class-join", `${ip}:${token.slice(0, 8)}`), 30, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  if (!token || !credential) {
    return NextResponse.json({ error: "Enter the email on your roster." }, { status: 400 });
  }

  if (action === "identify") {
    const identified = await identifyClassStudent(token, credential);
    if (!identified.ok) return NextResponse.json({ error: identified.error }, { status: 404 });
    return NextResponse.json(identified);
  }

  if (action === "create") {
    const password = String(body.password ?? "");
    const passwordConfirm = String(body.passwordConfirm ?? "");
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    const created = await createAccountFromClassJoin({ token, credential, password });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });
    const sent = await issueEmailLoginCode(created.userId);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
    return NextResponse.json({ ok: true, step: "verify", email: created.email });
  }

  if (action === "resend") {
    const classId = await resolveClassIdFromJoinToken(token);
    if (!classId) return NextResponse.json({ error: "This class link is not valid." }, { status: 400 });
    const student = await findClassStudentByCredential(classId, credential);
    if (!student?.userId || student.passwordSetAt) {
      return NextResponse.json({ error: "Create your account before requesting a code." }, { status: 400 });
    }
    const sent = await issueEmailLoginCode(student.userId);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
    return NextResponse.json({ ok: true, step: "verify" });
  }

  if (action === "verify") {
    const classId = await resolveClassIdFromJoinToken(token);
    if (!classId) return NextResponse.json({ error: "This class link is not valid." }, { status: 400 });
    const student = await findClassStudentByCredential(classId, credential);
    if (!student?.userId) {
      return NextResponse.json({ error: "Create your account before entering a code." }, { status: 400 });
    }
    if (student.passwordSetAt) {
      return NextResponse.json({ error: "This account is already confirmed. Sign in." }, { status: 400 });
    }
    const checked = await verifyEmailLoginCode(student.userId, String(body.code ?? ""));
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    await writeAuditLog({
      action: "CLASS_JOIN_EMAIL_CODE",
      targetType: "StudentProfile",
      targetId: student.id,
      outcome: "SUCCESS",
      ipHint: ip,
    });
    return sessionResponse(
      student.userId,
      student.id,
      student.schoolId,
      student.username ?? student.studentNumber,
      classId
    );
  }

  if (action === "login") {
    const classId = await resolveClassIdFromJoinToken(token);
    if (!classId) return NextResponse.json({ error: "This class link is not valid." }, { status: 400 });
    const student = await findClassStudentByCredential(classId, credential);
    if (!student?.passwordSetAt) {
      return NextResponse.json(
        { error: "Create your account before signing in." },
        { status: 400 }
      );
    }
    const user = await findUserByCredential(credential);
    if (!user || user.studentProfile?.id !== student.id) {
      return NextResponse.json({ error: "That email is not on this class roster." }, { status: 401 });
    }
    const password = String(body.password ?? "");
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      await writeAuditLog({
        action: "CLASS_JOIN_LOGIN_FAILED",
        targetType: "StudentProfile",
        targetId: student.id,
        outcome: "FAILURE",
        ipHint: ip,
      });
      return NextResponse.json({ error: "That password does not match." }, { status: 401 });
    }
    await writeAuditLog({
      action: "CLASS_JOIN_LOGIN",
      targetType: "StudentProfile",
      targetId: student.id,
      outcome: "SUCCESS",
      ipHint: ip,
    });
    return sessionResponse(
      user.id,
      student.id,
      student.schoolId,
      student.username ?? student.studentNumber,
      classId
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function sessionResponse(
  userId: string,
  studentId: string,
  schoolId: string,
  username: string,
  classId?: string
) {
  const token = await signSessionToken({
    userId,
    role: "STUDENT",
    schoolId,
    studentId,
  });
  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, opts);
  const next = classId ? `/student?classId=${encodeURIComponent(classId)}` : "/student";
  const res = NextResponse.json({
    ok: true,
    username,
    redirect: loginDestination("STUDENT", next),
  });
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
