import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resolveClassIdFromJoinToken } from "@/lib/services/class-join-link";
import { ensureUnder13CollectionAllowed } from "@/lib/auth/tenant-access";
import { credentialMatchesRosterStudent } from "@/lib/services/class-join-match";
import { studentLoginEmailForNumber } from "@/lib/services/student-login-invite";
import { validateAccountPassword } from "@/lib/services/login-invite-token";
import { ensureStudentUsername } from "@/lib/services/student-username";
import { hasPendingLoginCode, issueEmailLoginCode } from "@/lib/auth/email-login-code";
import { hashPendingAccountPlaceholder } from "@/lib/auth/pending-account-password";
import {
  emailMatchesRoster,
  loginPolicyForSlug,
  normalizeLoginEmail,
  schoolEmailHint,
} from "@/lib/school-login-email";

const BCRYPT_ROUNDS = 12;

export type ClassJoinPreview = {
  classId: string;
  className: string;
  period: string | null;
  coachName: string;
  schoolName: string;
};

type RosterMatch = {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  username: string | null;
  schoolId: string;
  userId: string | null;
  passwordSetAt: Date | null;
  schoolEmailConfirmedAt: Date | null;
  rosterEmail: string | null;
  schoolSlug: string | null;
};

export async function previewClassJoin(token: string): Promise<ClassJoinPreview | null> {
  const classId = await resolveClassIdFromJoinToken(token);
  if (!classId) return null;
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      school: { select: { name: true } },
      coach: { select: { user: { select: { firstName: true, lastName: true } } } },
      coachAssignments: {
        include: { coach: { select: { user: { select: { firstName: true, lastName: true } } } } },
        take: 1,
      },
    },
  });
  if (!cls) return null;
  const coachUser = cls.coach?.user ?? cls.coachAssignments[0]?.coach.user ?? null;
  const coachName = coachUser ? `${coachUser.firstName} ${coachUser.lastName}` : "your coach";
  return {
    classId: cls.id,
    className: cls.name,
    period: cls.period,
    coachName,
    schoolName: cls.school.name,
  };
}

async function rosterForClass(classId: string) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      school: { select: { id: true, slug: true } },
      enrollments: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
              username: true,
              rosterEmail: true,
              schoolId: true,
              userId: true,
              user: { select: { email: true, passwordSetAt: true, schoolEmailConfirmedAt: true } },
            },
          },
        },
      },
    },
  });
  return cls;
}

export async function findClassStudentByCredential(
  classId: string,
  credential: string
): Promise<RosterMatch | null> {
  const cls = await rosterForClass(classId);
  if (!cls) return null;
  const slug = cls.school.slug ?? "school";
  const match = cls.enrollments.find((row) =>
    credentialMatchesRosterStudent({
      credential,
      studentNumber: row.student.studentNumber,
      username: row.student.username,
      userEmail: row.student.user?.email ?? null,
      rosterEmail: row.student.rosterEmail,
      schoolSlug: slug,
    })
  );
  if (!match) return null;
  return {
    id: match.student.id,
    firstName: match.student.firstName,
    lastName: match.student.lastName,
    studentNumber: match.student.studentNumber,
    username: match.student.username,
    schoolId: match.student.schoolId,
    userId: match.student.userId,
    passwordSetAt: match.student.user?.passwordSetAt ?? null,
    schoolEmailConfirmedAt: match.student.user?.schoolEmailConfirmedAt ?? null,
    rosterEmail: match.student.rosterEmail,
    schoolSlug: slug,
  };
}

async function resolveJoinEmail(student: RosterMatch, credential: string): Promise<string | null> {
  const school = await prisma.school.findUnique({
    where: { id: student.schoolId },
    select: { slug: true },
  });
  const policy = loginPolicyForSlug(school?.slug ?? student.schoolSlug);
  const typed = normalizeLoginEmail(credential);
  const email = typed.includes("@")
    ? typed
    : student.rosterEmail?.includes("@")
      ? normalizeLoginEmail(student.rosterEmail)
      : policy
        ? ""
        : studentLoginEmailForNumber(student.studentNumber, school?.slug ?? "school");
  if (!email.includes("@")) return null;
  return email;
}

/** Link roster student to a User row with email only (password comes after the 6-digit code). */
export async function stageClassJoinStudent(input: {
  token: string;
  credential: string;
}): Promise<
  | { ok: true; userId: string; studentId: string; email: string }
  | { ok: false; error: string }
> {
  const classId = await resolveClassIdFromJoinToken(input.token);
  if (!classId) return { ok: false, error: "This class link is not valid." };
  const student = await findClassStudentByCredential(classId, input.credential);
  if (!student) {
    return { ok: false, error: "That email is not on this class roster." };
  }
  if (student.passwordSetAt) {
    return { ok: false, error: "This account already exists. Sign in with your password." };
  }
  const emailError = await newAccountEmailError(student, input.credential);
  if (emailError) return { ok: false, error: emailError };

  const profile = await prisma.studentProfile.findUnique({
    where: { id: student.id },
    select: { dateOfBirth: true, schoolId: true },
  });
  if (profile) {
    const coppa = await ensureUnder13CollectionAllowed(profile.schoolId, profile.dateOfBirth);
    if (!coppa.ok) return { ok: false, error: coppa.error };
  }

  const email = await resolveJoinEmail(student, input.credential);
  if (!email) {
    return { ok: false, error: "Your coach needs an email on the roster before you can create an account." };
  }

  const taken = await prisma.user.findUnique({
    where: { email },
    select: { id: true, studentProfile: { select: { id: true } } },
  });
  if (taken && taken.studentProfile?.id !== student.id) {
    return {
      ok: false,
      error:
        "That email is already tied to another account. Ask your coach to fix the roster email or remove the duplicate login.",
    };
  }

  const placeholderHash = await hashPendingAccountPlaceholder();
  const userId = await prisma.$transaction(async (tx) => {
    let linked = student.userId;
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
    } else if (taken && !taken.studentProfile) {
      linked = taken.id;
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
  return { ok: true, userId, studentId: student.id, email };
}

export async function beginClassJoinEmailVerification(input: {
  token: string;
  credential: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const staged = await stageClassJoinStudent(input);
  if (!staged.ok) return staged;
  const sent = await issueEmailLoginCode(staged.userId);
  if (!sent.ok) return sent;
  return { ok: true, email: staged.email };
}

async function newAccountEmailError(student: RosterMatch, credential: string): Promise<string | null> {
  const policy = loginPolicyForSlug(student.schoolSlug);
  if (!policy || student.passwordSetAt) return null;
  const email = normalizeLoginEmail(credential);
  const roster = student.rosterEmail ? normalizeLoginEmail(student.rosterEmail) : null;
  if (!email.includes("@") || !roster) {
    return `${schoolEmailHint(policy, "student")} Your coach needs that email on the roster before you can create an account.`;
  }
  if (!emailMatchesRoster(email, roster)) {
    return `${schoolEmailHint(policy, "student")} Use the email on your roster.`;
  }
  return null;
}

export async function identifyClassStudent(token: string, credential: string) {
  const classId = await resolveClassIdFromJoinToken(token);
  if (!classId) return { ok: false as const, error: "This class link is not valid." };
  const student = await findClassStudentByCredential(classId, credential);
  if (!student) {
    return {
      ok: false as const,
      error: "That email is not on this class roster. Use the email or username your coach has for you.",
    };
  }
  const emailError = await newAccountEmailError(student, credential);
  if (emailError && !student.passwordSetAt) {
    return { ok: false as const, error: emailError };
  }
  const username =
    student.username ??
    (await ensureStudentUsername(student.id).catch(() => student.studentNumber));
  const typed = normalizeLoginEmail(credential);
  const email = typed.includes("@")
    ? typed
    : student.rosterEmail?.includes("@")
      ? normalizeLoginEmail(student.rosterEmail)
      : null;
  if (student.passwordSetAt) {
    return {
      ok: true as const,
      step: "login" as const,
      studentId: student.id,
      fullName: `${student.firstName} ${student.lastName}`,
      username,
      hasAccount: true,
      email,
    };
  }

  if (student.userId && (await hasPendingLoginCode(student.userId))) {
    return {
      ok: true as const,
      step: "code" as const,
      studentId: student.id,
      fullName: `${student.firstName} ${student.lastName}`,
      username,
      hasAccount: false,
      email,
    };
  }

  const began = await beginClassJoinEmailVerification({ token, credential });
  if (!began.ok) return { ok: false as const, error: began.error };

  return {
    ok: true as const,
    step: "code" as const,
    studentId: student.id,
    fullName: `${student.firstName} ${student.lastName}`,
    username,
    hasAccount: false,
    email: began.email,
  };
}

export async function setClassJoinPassword(input: {
  token: string;
  credential: string;
  password: string;
}): Promise<
  | { ok: true; userId: string; studentId: string; schoolId: string; username: string; email: string }
  | { ok: false; error: string }
> {
  const passwordError = validateAccountPassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const classId = await resolveClassIdFromJoinToken(input.token);
  if (!classId) return { ok: false, error: "This class link is not valid." };
  const student = await findClassStudentByCredential(classId, input.credential);
  if (!student) {
    return { ok: false, error: "That email is not on this class roster." };
  }
  if (student.passwordSetAt) {
    return { ok: false, error: "This account already exists. Sign in with your password." };
  }
  if (!student.userId || !student.schoolEmailConfirmedAt) {
    return { ok: false, error: "Confirm the code we emailed you before creating a password." };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();
  await prisma.user.update({
    where: { id: student.userId },
    data: { passwordHash, passwordSetAt: now },
  });

  const username = await ensureStudentUsername(student.id).catch(() => student.username ?? student.studentNumber);
  const user = await prisma.user.findUnique({
    where: { id: student.userId },
    select: { email: true },
  });
  return {
    ok: true,
    userId: student.userId,
    studentId: student.id,
    schoolId: student.schoolId,
    username,
    email: user?.email ?? "",
  };
}
