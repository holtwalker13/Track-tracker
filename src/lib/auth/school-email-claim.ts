import { prisma } from "@/lib/db";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  emailAllowedByPolicy,
  isSeedDemoLogin,
  loginPolicyForSlug,
  normalizeLoginEmail,
  schoolEmailHint,
  type LoginAudience,
} from "@/lib/school-login-email";

type ExceptionRow = { email: string; role: string };

export type SchoolEmailAccount = {
  userId: string;
  role: string;
  email: string;
  passwordSetAt: Date | null;
  schoolEmailConfirmedAt: Date | null;
  schoolId: string | null;
  schoolSlug: string | null;
  rosterEmail: string | null;
  audience: LoginAudience | null;
};

export async function loadSchoolEmailAccount(userId: string): Promise<SchoolEmailAccount | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      passwordSetAt: true,
      schoolEmailConfirmedAt: true,
      studentProfile: {
        select: {
          rosterEmail: true,
          schoolId: true,
          school: { select: { slug: true } },
        },
      },
      coachProfile: {
        select: { schoolId: true, school: { select: { slug: true } } },
      },
    },
  });
  if (!user) return null;
  const student = user.studentProfile;
  const coach = user.coachProfile;
  const audience: LoginAudience | null =
    user.role === "COACH" ? "faculty" : user.role === "STUDENT" ? "student" : null;
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    passwordSetAt: user.passwordSetAt,
    schoolEmailConfirmedAt: user.schoolEmailConfirmedAt,
    schoolId: student?.schoolId ?? coach?.schoolId ?? null,
    schoolSlug: student?.school.slug ?? coach?.school.slug ?? null,
    rosterEmail: student?.rosterEmail ?? null,
    audience,
  };
}

async function exceptionsFor(schoolId: string | null): Promise<ExceptionRow[]> {
  if (!schoolId) return [];
  return prisma.schoolLoginEmailException.findMany({
    where: { schoolId },
    select: { email: true, role: true },
  });
}

export function accountNeedsSchoolEmail(account: SchoolEmailAccount): boolean {
  if (!account.audience || !account.passwordSetAt || account.schoolEmailConfirmedAt) return false;
  const policy = loginPolicyForSlug(account.schoolSlug);
  if (!policy) return false;
  if (isSeedDemoLogin(account.email)) return false;
  return true;
}

export async function userMustClaimSchoolEmail(userId: string): Promise<boolean> {
  const account = await loadSchoolEmailAccount(userId);
  if (!account) return false;
  return accountNeedsSchoolEmail(account);
}

/** When a sign-in already used an allowed school email, remember that and skip the prompt. */
export async function settleSchoolEmailOnLogin(userId: string, credential: string): Promise<boolean> {
  const account = await loadSchoolEmailAccount(userId);
  if (!account?.audience || !account.schoolId) return false;
  const policy = loginPolicyForSlug(account.schoolSlug);
  if (!policy || !account.passwordSetAt) return false;
  if (account.schoolEmailConfirmedAt || isSeedDemoLogin(account.email)) return false;

  const typed = normalizeLoginEmail(credential);
  if (!typed.includes("@")) return accountNeedsSchoolEmail(account);

  const exceptions = await exceptionsFor(account.schoolId);
  const allowed = emailAllowedByPolicy({
    email: typed,
    audience: account.audience,
    policy,
    exceptions,
  });
  if (!allowed) return accountNeedsSchoolEmail(account);

  const roster = account.rosterEmail ? normalizeLoginEmail(account.rosterEmail) : null;
  if (account.audience === "student" && roster && roster !== typed && account.email !== typed) {
    return true;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: typed,
      schoolEmailConfirmedAt: new Date(),
      ...(account.audience === "student"
        ? { studentProfile: { update: { rosterEmail: typed } } }
        : {}),
    },
  });
  return false;
}

export function schoolEmailPromptPath(role: string, nextRaw: string | undefined): string {
  const next = loginDestination(role, nextRaw);
  return `/login/school-email?next=${encodeURIComponent(next)}`;
}

export async function claimSchoolLoginEmail(
  userId: string,
  rawEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const account = await loadSchoolEmailAccount(userId);
  if (!account?.audience || !account.schoolId) {
    return { ok: false, error: "This account does not need a school email." };
  }
  const policy = loginPolicyForSlug(account.schoolSlug);
  if (!policy) return { ok: false, error: "This school does not require a school email." };

  const email = normalizeLoginEmail(rawEmail);
  if (!email.includes("@")) return { ok: false, error: "Enter a full email address." };

  const exceptions = await exceptionsFor(account.schoolId);
  if (!emailAllowedByPolicy({ email, audience: account.audience, policy, exceptions })) {
    return { ok: false, error: schoolEmailHint(policy, account.audience) };
  }

  const roster = account.rosterEmail ? normalizeLoginEmail(account.rosterEmail) : null;
  if (account.audience === "student" && roster && roster !== email) {
    const rosterAllowed = emailAllowedByPolicy({
      email: roster,
      audience: "student",
      policy,
      exceptions,
    });
    if (rosterAllowed) {
      return { ok: false, error: `Use the email already on your roster: ${roster}` };
    }
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken && taken.id !== userId) {
    return { ok: false, error: "That email is already used by another account." };
  }

  if (account.audience === "student") {
    const other = await prisma.studentProfile.findFirst({
      where: { schoolId: account.schoolId, rosterEmail: email, userId: { not: userId } },
      select: { id: true },
    });
    if (other) return { ok: false, error: "That email is already on another student's roster." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      schoolEmailConfirmedAt: new Date(),
      ...(account.audience === "student"
        ? { studentProfile: { update: { rosterEmail: email } } }
        : {}),
    },
  });
  return { ok: true };
}
