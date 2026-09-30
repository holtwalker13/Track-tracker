import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { findUserByCredential } from "@/lib/auth/credentials-login";
import { SESSION_COOKIE, sessionCookieOptions, relativeRedirect } from "@/lib/auth/cookie";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { signSessionToken } from "@/lib/auth/session";

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
      password: String(body.password ?? ""),
      next: body.next ? String(body.next) : undefined,
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    next: form.get("next") ? String(form.get("next")) : undefined,
  };
}

function safeNext(next: string | undefined, role: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
    return next;
  }
  if (role === "STUDENT") return "/student";
  if (role === "ADMIN") return "/admin";
  return "/coach/school/roster";
}

export async function POST(request: Request) {
  const { email: credential, password, next } = await readCredentials(request);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");

  const user = await findUserByCredential(credential);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (wantsJson) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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

  const destination = safeNext(next, user.role);
  if (wantsJson) {
    const res = NextResponse.json({ ok: true, redirect: destination });
    res.cookies.set(SESSION_COOKIE, token, opts);
    return res;
  }

  const res = relativeRedirect(destination, 303);
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
