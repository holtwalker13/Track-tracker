import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
  inviteJoinPath,
  validateAccountPassword,
} from "@/lib/services/login-invite-token";

const BCRYPT_ROUNDS = 12;

export type CoachInvitePreview = {
  fullName: string;
  email: string;
  schoolName: string;
  purpose: "SETUP" | "RESET";
  alreadyActive: boolean;
  expired: boolean;
  used: boolean;
};

export function coachJoinPath(token: string): string {
  return inviteJoinPath("/coach/join", token);
}

export async function createOrRefreshCoachLoginInvite(
  coachProfileId: string,
  createdById?: string
): Promise<{ token: string; urlPath: string; expiresAt: Date }> {
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachProfileId },
    include: {
      user: { select: { passwordSetAt: true } },
      school: { select: { name: true } },
    },
  });
  if (!coach) throw new Error("Coach not found");

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.coachLoginInvite.upsert({
    where: { coachProfileId },
    create: { coachProfileId, tokenHash, expiresAt, createdById },
    update: { tokenHash, expiresAt, usedAt: null, createdById },
  });

  return { token, urlPath: coachJoinPath(token), expiresAt };
}

async function loadCoachInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token.trim());
  return prisma.coachLoginInvite.findUnique({
    where: { tokenHash },
    include: {
      coachProfile: {
        include: {
          user: { select: { id: true, email: true, passwordSetAt: true, firstName: true, lastName: true } },
          school: { select: { name: true } },
        },
      },
    },
  });
}

export async function previewCoachLoginInvite(token: string): Promise<CoachInvitePreview | null> {
  const invite = await loadCoachInviteByToken(token);
  if (!invite) return null;

  const user = invite.coachProfile.user;
  const alreadyActive = Boolean(user.passwordSetAt);
  const used = Boolean(invite.usedAt);
  const expired = invite.expiresAt.getTime() < Date.now();

  return {
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    schoolName: invite.coachProfile.school.name,
    purpose: alreadyActive ? "RESET" : "SETUP",
    alreadyActive,
    expired,
    used,
  };
}

export async function completeCoachLoginInvite(input: {
  token: string;
  password: string;
  confirmName: boolean;
}): Promise<
  | { ok: true; email: string; userId: string; schoolId: string }
  | { ok: false; error: string }
> {
  if (!input.confirmName) {
    return { ok: false, error: "Please confirm your name before continuing." };
  }

  const passwordError = validateAccountPassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const invite = await loadCoachInviteByToken(input.token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  if (invite.usedAt) return { ok: false, error: "This link has already been used." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask your admin for a new one." };
  }

  const coach = invite.coachProfile;
  const purpose = coach.user.passwordSetAt ? "RESET" : "SETUP";
  if (purpose === "SETUP" && coach.user.passwordSetAt) {
    return { ok: false, error: "This account is already set up." };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    const fresh = await tx.coachLoginInvite.findUnique({
      where: { id: invite.id },
      select: { usedAt: true, expiresAt: true },
    });
    if (!fresh || fresh.usedAt || fresh.expiresAt.getTime() < Date.now()) {
      throw new Error("INVITE_UNAVAILABLE");
    }

    await tx.user.update({
      where: { id: coach.userId },
      data: { passwordHash, passwordSetAt: now },
    });

    await tx.coachLoginInvite.update({
      where: { id: invite.id },
      data: { usedAt: now },
    });

    return tx.user.findUniqueOrThrow({ where: { id: coach.userId } });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INVITE_UNAVAILABLE") return null;
    throw err;
  });

  if (!user) {
    return { ok: false, error: "This link is no longer valid. Ask your admin for a new one." };
  }

  return {
    ok: true,
    email: user.email,
    userId: user.id,
    schoolId: coach.schoolId,
  };
}

export type CoachLoginStatus = "none" | "invite" | "active";

export function coachLoginStatusFromRow(row: {
  user: { passwordSetAt: Date | null };
  loginInvite: { usedAt: Date | null; expiresAt: Date } | null;
}): CoachLoginStatus {
  if (row.user.passwordSetAt) return "active";
  if (row.loginInvite && !row.loginInvite.usedAt && row.loginInvite.expiresAt.getTime() > Date.now()) {
    return "invite";
  }
  return "none";
}

/** Placeholder hash until the coach completes an invite link. */
export async function placeholderPasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), 12);
}
