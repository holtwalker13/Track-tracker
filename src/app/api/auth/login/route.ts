import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true, studentProfile: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role as "ADMIN" | "COACH" | "STUDENT",
    schoolId: user.coachProfile?.schoolId ?? user.studentProfile?.schoolId,
    studentId: user.studentProfile?.id,
  });

  const redirect = user.role === "STUDENT" ? "/student" : "/coach";
  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
