import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { studentEmailDomainForSchoolSlug } from "@/lib/services/student-login";
import { ensureStudentUsername } from "@/lib/services/student-username";
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
  inviteJoinPath,
  validateAccountPassword,
} from "@/lib/services/login-invite-token";
import { ensureUnder13CollectionAllowed } from "@/lib/auth/tenant-access";
import {
  hasPendingLoginCode,
  issueEmailLoginCode,
  verifyClassJoinEmailCode,
} from "@/lib/auth/email-login-code";
import { hashPendingAccountPlaceholder } from "@/lib/auth/pending-account-password";
import { normalizeLoginEmail } from "@/lib/school-login-email";

const BCRYPT_ROUNDS = 12;

export { hashInviteToken, generateInviteToken } from "@/lib/services/login-invite-token";

export type StudentInvitePurpose = "SETUP" | "RESET";

export type StudentInvitePreview = {
  fullName: string;
  username: string;
  schoolName: string;
  purpose: StudentInvitePurpose;
  alreadyActive: boolean;
  expired: boolean;
  used: boolean;
  deliveryEmail?: string;
  emailVerified?: boolean;
  pendingCode?: boolean;
};

export function resolveStudentInviteEmail(student: {
  studentNumber: string;
  rosterEmail: string | null;
  school: { slug: string | null };
}): string {
  const roster = student.rosterEmail ? normalizeLoginEmail(student.rosterEmail) : "";
  if (roster.includes("@")) return roster;
  return studentLoginEmailForNumber(student.studentNumber, student.school.slug ?? "school");
}

/** Stable login email tied to roster student ID (not shown in the invite URL). */
export function studentLoginEmailForNumber(studentNumber: string, schoolSlug: string): string {
  const local = studentNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "student";
  const domain = studentEmailDomainForSchoolSlug(schoolSlug);
  return `${local}@${domain}`;
}

export function studentJoinPath(token: string): string {
  return inviteJoinPath("/student/join", token);
}

export function validateStudentPassword(password: string): string | null {
  return validateAccountPassword(password);
}

export async function createOrRefreshStudentLoginInvite(
  studentId: string,
  createdById?: string
): Promise<{ token: string; urlPath: string; expiresAt: Date }> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { passwordSetAt: true } },
      school: { select: { name: true } },
    },
  });
  if (!student) throw new Error("Student not found");

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.studentLoginInvite.upsert({
    where: { studentId },
    create: {
      studentId,
      tokenHash,
      expiresAt,
      createdById,
    },
    update: {
      tokenHash,
      expiresAt,
      usedAt: null,
      createdById,
    },
  });

  return { token, urlPath: studentJoinPath(token), expiresAt };
}

async function loadInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token.trim());
  return prisma.studentLoginInvite.findUnique({
    where: { tokenHash },
    include: {
      student: {
        include: {
          user: {
            select: { id: true, passwordSetAt: true, schoolEmailConfirmedAt: true },
          },
          school: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export async function previewStudentLoginInvite(token: string): Promise<StudentInvitePreview | null> {
  const invite = await loadInviteByToken(token);
  if (!invite) return null;

  const { student } = invite;
  const alreadyActive = Boolean(student.user?.passwordSetAt);
  const used = Boolean(invite.usedAt);
  const expired = invite.expiresAt.getTime() < Date.now();
  const purpose: StudentInvitePurpose = alreadyActive ? "RESET" : "SETUP";

  const username =
    student.username ??
    (await ensureStudentUsername(student.id).catch(() => student.studentNumber));

  const deliveryEmail = resolveStudentInviteEmail(student);
  const emailVerified = Boolean(student.user?.schoolEmailConfirmedAt);
  const pendingUserId = student.user?.id;
  const pendingCode =
    !alreadyActive && pendingUserId != null && (await hasPendingLoginCode(pendingUserId));

  return {
    fullName: `${student.firstName} ${student.lastName}`,
    username,
    schoolName: student.school.name,
    purpose,
    alreadyActive,
    expired,
    used,
    deliveryEmail: deliveryEmail.includes("@") ? deliveryEmail : undefined,
    emailVerified: alreadyActive ? undefined : emailVerified,
    pendingCode: alreadyActive ? undefined : pendingCode,
  };
}

async function assertInviteAvailableForSetup(
  invite: NonNullable<Awaited<ReturnType<typeof loadInviteByToken>>>,
  alreadyActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (alreadyActive) return { ok: true };
  if (invite.usedAt) return { ok: false, error: "This link has already been used." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask your coach for a new one." };
  }
  return { ok: true };
}

export async function stageStudentInviteAccount(
  invite: NonNullable<Awaited<ReturnType<typeof loadInviteByToken>>>
): Promise<{ ok: true; userId: string; email: string } | { ok: false; error: string }> {
  const student = invite.student;
  const alreadyActive = Boolean(student.user?.passwordSetAt);
  const gate = await assertInviteAvailableForSetup(invite, alreadyActive);
  if (!gate.ok) return gate;

  const email = resolveStudentInviteEmail(student);
  if (!email.includes("@")) {
    return {
      ok: false,
      error: "Your coach needs an email on the roster before a verification code can be sent.",
    };
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { id: student.id },
    select: { dateOfBirth: true, schoolId: true },
  });
  if (profile && !alreadyActive) {
    const coppa = await ensureUnder13CollectionAllowed(profile.schoolId, profile.dateOfBirth);
    if (!coppa.ok) return { ok: false, error: coppa.error };
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, studentProfile: { select: { id: true } } },
  });
  if (existingEmail && existingEmail.studentProfile?.id !== student.id) {
    return { ok: false, error: "Unable to create login for this student. Contact your coach." };
  }

  const placeholderHash = await hashPendingAccountPlaceholder();
  const userId = await prisma.$transaction(async (tx) => {
    let linked = student.user?.id ?? null;
    if (linked) {
      await tx.user.update({
        where: { id: linked },
        data: {
          email,
          passwordHash: placeholderHash,
          passwordSetAt: null,
          schoolEmailConfirmedAt: null,
          firstName: student.firstName,
          lastName: student.lastName,
        },
      });
    } else if (existingEmail && !existingEmail.studentProfile) {
      linked = existingEmail.id;
      await tx.user.update({
        where: { id: linked },
        data: {
          email,
          passwordHash: placeholderHash,
          passwordSetAt: null,
          schoolEmailConfirmedAt: null,
          role: "STUDENT",
          firstName: student.firstName,
          lastName: student.lastName,
        },
      });
      await tx.studentProfile.update({
        where: { id: student.id },
        data: { userId: linked },
      });
    } else {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash: placeholderHash,
          role: "STUDENT",
          firstName: student.firstName,
          lastName: student.lastName,
          passwordSetAt: null,
          schoolEmailConfirmedAt: null,
        },
      });
      linked = created.id;
      await tx.studentProfile.update({
        where: { id: student.id },
        data: { userId: linked },
      });
    }
    return linked!;
  });

  await ensureStudentUsername(student.id).catch(() => undefined);
  return { ok: true, userId, email };
}

export async function beginStudentInviteEmailVerification(
  token: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const invite = await loadInviteByToken(token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  if (invite.student.user?.passwordSetAt) {
    return { ok: false, error: "This account already exists. Sign in with your password." };
  }
  if (invite.student.user?.schoolEmailConfirmedAt) {
    const email = resolveStudentInviteEmail(invite.student);
    return { ok: true, email };
  }

  const staged = await stageStudentInviteAccount(invite);
  if (!staged.ok) return staged;
  const sent = await issueEmailLoginCode(staged.userId);
  if (!sent.ok) return sent;
  return { ok: true, email: staged.email };
}

export async function verifyStudentInviteEmailCode(
  token: string,
  rawCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invite = await loadInviteByToken(token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  const userId = invite.student.user?.id;
  if (!userId) {
    return { ok: false, error: "Request a verification code first." };
  }
  if (invite.student.user?.passwordSetAt) {
    return { ok: false, error: "This account is already set up. Sign in." };
  }
  return verifyClassJoinEmailCode(userId, rawCode);
}

export async function resendStudentInviteEmailCode(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invite = await loadInviteByToken(token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  if (invite.student.user?.passwordSetAt) {
    return { ok: false, error: "This account already exists. Sign in." };
  }
  if (invite.student.user?.schoolEmailConfirmedAt) {
    return { ok: false, error: "Email already confirmed. Create your password below." };
  }
  let userId = invite.student.user?.id;
  if (!userId) {
    const staged = await stageStudentInviteAccount(invite);
    if (!staged.ok) return staged;
    userId = staged.userId;
  }
  return issueEmailLoginCode(userId);
}

export async function completeStudentLoginInvite(input: {
  token: string;
  password: string;
  confirmName: boolean;
}): Promise<
  | { ok: true; email: string; username: string; userId: string; studentId: string; schoolId: string }
  | { ok: false; error: string }
> {
  if (!input.confirmName) {
    return { ok: false, error: "Please confirm your name before continuing." };
  }

  const passwordError = validateStudentPassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const invite = await loadInviteByToken(input.token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };

  const student = invite.student;
  const alreadyActive = Boolean(student.user?.passwordSetAt);

  const profile = await prisma.studentProfile.findUnique({
    where: { id: student.id },
    select: { dateOfBirth: true, schoolId: true },
  });
  if (profile && !alreadyActive) {
    const coppa = await ensureUnder13CollectionAllowed(profile.schoolId, profile.dateOfBirth);
    if (!coppa.ok) return { ok: false, error: coppa.error };
  }

  if (!alreadyActive && invite.usedAt) {
    return { ok: false, error: "This link has already been used." };
  }
  if (!alreadyActive && invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask your coach for a new one." };
  }

  if (!alreadyActive && !student.user?.schoolEmailConfirmedAt) {
    return { ok: false, error: "Confirm the code we emailed you before creating a password." };
  }

  const email = resolveStudentInviteEmail(student);

  const existingEmail = await prisma.user.findUnique({
    where: { email },
    select: { studentProfile: { select: { id: true } } },
  });
  if (existingEmail && existingEmail.studentProfile?.id !== student.id) {
    return { ok: false, error: "Unable to create login for this student ID. Contact your coach." };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentLoginInvite.findUnique({
      where: { id: invite.id },
      select: { usedAt: true, expiresAt: true },
    });
    const active = Boolean(student.user?.passwordSetAt);
    if (!fresh || (!active && (fresh.usedAt || fresh.expiresAt.getTime() < Date.now()))) {
      throw new Error("INVITE_UNAVAILABLE");
    }

    let linkedUserId = student.user?.id;
    if (linkedUserId) {
      await tx.user.update({
        where: { id: linkedUserId },
        data: {
          email,
          passwordHash,
          passwordSetAt: now,
          firstName: student.firstName,
          lastName: student.lastName,
        },
      });
    } else if (active) {
      throw new Error("INVITE_UNAVAILABLE");
    } else {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "STUDENT",
          firstName: student.firstName,
          lastName: student.lastName,
          passwordSetAt: now,
        },
      });
      linkedUserId = created.id;
      await tx.studentProfile.update({
        where: { id: student.id },
        data: { userId: linkedUserId },
      });
    }

    await tx.studentLoginInvite.update({
      where: { id: invite.id },
      data: { usedAt: now },
    });

    if (!student.username) {
      const classYearRow = await tx.studentEnrollment.findFirst({
        where: { studentId: student.id, schoolYear: { isCurrent: true } },
        select: { gradeLevel: true },
      });
      const { buildStudentUsernameBase, pickUniqueUsername } = await import(
        "@/lib/services/student-username"
      );
      const base = buildStudentUsernameBase(
        student.firstName,
        student.lastName,
        classYearRow?.gradeLevel ?? 2028
      );
      const username = await pickUniqueUsername(student.schoolId, base, student.id);
      await tx.studentProfile.update({
        where: { id: student.id },
        data: { username },
      });
    }

    return tx.user.findUniqueOrThrow({ where: { id: linkedUserId! } });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INVITE_UNAVAILABLE") return null;
    throw err;
  });

  if (!user) {
    return { ok: false, error: "This link is no longer valid. Ask your coach for a new one." };
  }

  const username = await ensureStudentUsername(student.id).catch(async () => {
    const row = await prisma.studentProfile.findUnique({
      where: { id: student.id },
      select: { username: true, studentNumber: true },
    });
    return row?.username ?? row?.studentNumber ?? student.studentNumber;
  });

  const saved = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordSetAt: true, passwordHash: true },
  });
  if (!saved?.passwordSetAt) {
    return { ok: false, error: "Password could not be saved. Ask your coach for a new link and try again." };
  }

  return {
    ok: true,
    email: user.email,
    username,
    userId: user.id,
    studentId: student.id,
    schoolId: student.schoolId,
  };
}

export type StudentLoginStatus = "none" | "invite" | "active";

export function studentLoginStatusFromRow(row: {
  userId: string | null;
  user: { passwordSetAt: Date | null } | null;
  loginInvite: { usedAt: Date | null; expiresAt: Date } | null;
}): StudentLoginStatus {
  if (row.user?.passwordSetAt) return "active";
  if (row.loginInvite && !row.loginInvite.usedAt && row.loginInvite.expiresAt.getTime() > Date.now()) {
    return "invite";
  }
  return "none";
}
