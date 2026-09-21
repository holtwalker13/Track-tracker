"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true, studentProfile: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  const schoolId = user.coachProfile?.schoolId ?? user.studentProfile?.schoolId;

  const token = await signSessionToken({
    userId: user.id,
    role: user.role as "ADMIN" | "COACH" | "STUDENT",
    schoolId,
    studentId: user.studentProfile?.id,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());

  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/login")
      ? nextRaw
      : user.role === "STUDENT"
        ? "/student"
        : user.role === "ADMIN"
          ? "/admin"
          : "/coach/leaderboards";

  redirect(next);
}
