"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { signSessionToken } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  let user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true, studentProfile: true },
  });

  if (!user && !email.includes("@")) {
    const profile = await prisma.studentProfile.findFirst({
      where: { studentNumber: email.toUpperCase() },
      include: { user: { include: { coachProfile: true, studentProfile: true } } },
    });
    if (profile?.user) user = profile.user;
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  if (await studentUsesBlockedSharedDemoPassword(user)) {
    redirect("/login?error=1");
  }

  if ((user.role === "STUDENT" || user.role === "COACH") && !user.passwordSetAt) {
    redirect("/login?error=setup");
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
          : "/coach/school";

  redirect(next);
}
