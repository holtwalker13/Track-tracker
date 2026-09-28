import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { studentEmailDomainForSchoolSlug } from "@/lib/services/student-login";
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
  inviteJoinPath,
  validateAccountPassword,
} from "@/lib/services/login-invite-token";

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
};

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
          user: { select: { id: true, passwordSetAt: true } },
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

  return {
    fullName: `${student.firstName} ${student.lastName}`,
    username: student.studentNumber,
    schoolName: student.school.name,
    purpose,
    alreadyActive,
    expired,
    used,
  };
}

export async function completeStudentLoginInvite(input: {
  token: string;
  password: string;
  confirmName: boolean;
}): Promise<
  | { ok: true; email: string; userId: string; studentId: string; schoolId: string }
  | { ok: false; error: string }
> {
  if (!input.confirmName) {
    return { ok: false, error: "Please confirm your name before continuing." };
  }

  const passwordError = validateStudentPassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const invite = await loadInviteByToken(input.token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  if (invite.usedAt) return { ok: false, error: "This link has already been used." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask your coach for a new one." };
  }

  const student = invite.student;
  const purpose: StudentInvitePurpose = student.user?.passwordSetAt ? "RESET" : "SETUP";

  if (purpose === "SETUP" && student.user?.passwordSetAt) {
    return { ok: false, error: "This account is already set up. Ask your coach for a new login link." };
  }
  if (purpose === "RESET" && !student.user?.passwordSetAt) {
    return { ok: false, error: "This link is for password reset, but the account is not set up yet." };
  }

  const schoolSlug = student.school.slug ?? "school";
  const email = studentLoginEmailForNumber(student.studentNumber, schoolSlug);

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
    if (!fresh || fresh.usedAt || fresh.expiresAt.getTime() < Date.now()) {
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
    } else if (purpose === "RESET") {
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

    return tx.user.findUniqueOrThrow({ where: { id: linkedUserId! } });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INVITE_UNAVAILABLE") return null;
    throw err;
  });

  if (!user) {
    return { ok: false, error: "This link is no longer valid. Ask your coach for a new one." };
  }

  return {
    ok: true,
    email: user.email,
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
