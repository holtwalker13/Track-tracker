import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import type { CredentialUser } from "@/lib/auth/credentials-login";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  schoolEmailPromptPath,
  settleSchoolEmailOnLogin,
} from "@/lib/auth/school-email-claim";
import { signSessionToken } from "@/lib/auth/session";

export type LoginUser = CredentialUser;

export async function establishSessionFromUser(
  user: LoginUser,
  nextRaw: string,
  credential?: string
) {
  const schoolId = user.coachProfile?.schoolId ?? user.studentProfile?.schoolId;

  const token = await signSessionToken({
    userId: user.id,
    role: user.role as "ADMIN" | "COACH" | "STUDENT",
    schoolId,
    studentId: user.studentProfile?.id,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());

  const claim =
    credential != null && (await settleSchoolEmailOnLogin(user.id, credential));
  const next = claim
    ? schoolEmailPromptPath(user.role, nextRaw)
    : loginDestination(user.role, nextRaw);

  redirect(next);
}
