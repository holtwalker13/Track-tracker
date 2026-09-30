"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { signSessionToken } from "@/lib/auth/session";

export type LoginUser = {
  id: string;
  role: string;
  email: string;
  passwordHash: string;
  passwordSetAt: Date | null;
  coachProfile: { schoolId: string } | null;
  studentProfile: { id: string; schoolId: string } | null;
};

async function findUserByEmailOrStudentId(email: string): Promise<LoginUser | null> {
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

  return user;
}

export async function establishSessionFromUser(user: LoginUser, nextRaw: string) {
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
          : "/coach/school/roster";

  redirect(next);
}

async function authenticate(email: string, password: string, nextRaw: string) {
  const user = await findUserByEmailOrStudentId(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  if (await studentUsesBlockedSharedDemoPassword(user)) {
    redirect("/login?error=1");
  }

  if ((user.role === "STUDENT" || user.role === "COACH") && !user.passwordSetAt) {
    redirect("/login?error=setup");
  }

  await establishSessionFromUser(user, nextRaw);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  await authenticate(email, password, nextRaw);
}
