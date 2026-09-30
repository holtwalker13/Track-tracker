"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { findUserByCredential, type CredentialUser } from "@/lib/auth/credentials-login";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { signSessionToken } from "@/lib/auth/session";

export type LoginUser = CredentialUser;

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

async function authenticate(credential: string, password: string, nextRaw: string) {
  const user = await findUserByCredential(credential);

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
  const credential = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextRaw = String(formData.get("next") ?? "");
  await authenticate(credential, password, nextRaw);
}
