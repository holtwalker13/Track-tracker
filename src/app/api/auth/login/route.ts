import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { findUserByCredential } from "@/lib/auth/credentials-login";
import { SESSION_COOKIE, sessionCookieOptions, relativeRedirect } from "@/lib/auth/cookie";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  schoolEmailPromptPath,
  settleSchoolEmailOnLogin,
} from "@/lib/auth/school-email-claim";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { signSessionToken } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { clientIpHint, writeAuditLog } from "@/lib/security/audit-log";

async function readCredentials(request: Request): Promise<{
  email: string;
  password: string;
  next?: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      email: String(body.email ?? "").trim(),
      password: String(body.password ?? "").trim(),
      next: body.next ? String(body.next) : undefined,
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? "").trim(),
    next: form.get("next") ? String(form.get("next")) : undefined,
  };
}

function safeNext(next: string | undefined, role: string): string {
  return loginDestination(role, next);
}

export async function POST(request: Request) {
  const { email: credential, password, next } = await readCredentials(request);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const ip = clientIpHint(request) ?? "unknown";
  const limit = checkRateLimit(rateLimitKey("login", `${ip}:${credential.toLowerCase().slice(0, 64)}`), 20, 15 * 60 * 1000);
  if (!limit.allowed) {
    if (wantsJson) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }
    return relativeRedirect("/login?error=rate");
  }

  const user = await findUserByCredential(credential);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await writeAuditLog({
      action: "AUTH_LOGIN_FAILED",
      outcome: "FAILURE",
      ipHint: ip,
      metadata: { credentialHint: credential.includes("@") ? "email" : "username" },
    });
    if (wantsJson) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return relativeRedirect("/login?error=1");
  }
  if (user.disabledAt) {
    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: "AUTH_LOGIN_DISABLED",
      outcome: "DENIED",
      ipHint: ip,
    });
    if (wantsJson) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }
    return relativeRedirect("/login?error=1");
  }

  if (await studentUsesBlockedSharedDemoPassword(user)) {
    if (wantsJson) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return relativeRedirect("/login?error=1");
  }

  if ((user.role === "STUDENT" || user.role === "COACH") && !user.passwordSetAt) {
    if (wantsJson) {
      return NextResponse.json(
        {
          error:
            user.role === "COACH"
              ? "Finish account setup using the link or QR code from your admin."
              : "Finish account setup using the link from your coach.",
        },
        { status: 403 }
      );
    }
    return relativeRedirect("/login?error=setup");
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

  const claim = await settleSchoolEmailOnLogin(user.id, credential);
  const destination = claim ? schoolEmailPromptPath(user.role, next) : safeNext(next, user.role);
  await writeAuditLog({
    actorUserId: user.id,
    actorRole: user.role,
    schoolId: schoolId ?? undefined,
    action: "AUTH_LOGIN_SUCCESS",
    outcome: "SUCCESS",
    ipHint: ip,
  });
  if (wantsJson) {
    const res = NextResponse.json({ ok: true, redirect: destination });
    res.cookies.set(SESSION_COOKIE, token, opts);
    return res;
  }

  const res = relativeRedirect(destination, 303);
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
