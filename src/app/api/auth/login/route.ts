import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
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
      email: String(body.email ?? "").toLowerCase().trim(),
      password: String(body.password ?? ""),
      next: body.next ? String(body.next) : undefined,
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").toLowerCase().trim(),
    password: String(form.get("password") ?? ""),
    next: form.get("next") ? String(form.get("next")) : undefined,
  };
}

function safeNext(next: string | undefined, role: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
    return next;
  }
  return role === "STUDENT" ? "/student" : "/coach";
}

export async function POST(request: Request) {
  const { email, password, next } = await readCredentials(request);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true, studentProfile: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (wantsJson) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url);
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role as "ADMIN" | "COACH" | "STUDENT",
    schoolId: user.coachProfile?.schoolId ?? user.studentProfile?.schoolId,
    studentId: user.studentProfile?.id,
  });

  const destination = safeNext(next, user.role);
  const res = wantsJson
    ? NextResponse.json({ ok: true, redirect: destination })
    : NextResponse.redirect(new URL(destination, request.url), 303);

  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(undefined, request));
  return res;
}
