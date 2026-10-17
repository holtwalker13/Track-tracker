import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { sendLoginCodeEmail } from "@/lib/email/send-login-code";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashLoginCode(userId: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-login-code";
  return createHash("sha256").update(`${secret}:${userId}:${code}`).digest("hex");
}

export async function hasPendingLoginCode(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const row = await prisma.emailLoginCode.findFirst({
    where: {
      userId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function issueEmailLoginCode(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, passwordSetAt: true },
  });
  if (!user) return { ok: false, error: "Create your account before requesting a code." };
  if (user.passwordSetAt) return { ok: false, error: "This account is already confirmed. Sign in." };
  if (!user.email.includes("@")) {
    return { ok: false, error: "Your coach needs an email on the roster before a code can be sent." };
  }

  const code = generateLoginCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.emailLoginCode.deleteMany({ where: { userId, consumedAt: null } });
  const row = await prisma.emailLoginCode.create({
    data: { userId, codeHash: hashLoginCode(userId, code), expiresAt },
  });

  const sent = await sendLoginCodeEmail({ to: user.email, code, firstName: user.firstName });
  if (!sent.ok) {
    await prisma.emailLoginCode.delete({ where: { id: row.id } }).catch(() => undefined);
    return sent;
  }
  return { ok: true };
}

export async function verifyEmailLoginCode(
  userId: string,
  rawCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = rawCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code from your email." };

  const row = await prisma.emailLoginCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code expired. Send a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many tries. Send a new code." };
  }

  const expected = hashLoginCode(userId, code);
  const match =
    expected.length === row.codeHash.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(row.codeHash));
  if (!match) {
    await prisma.emailLoginCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "That code does not match." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailLoginCode.update({ where: { id: row.id }, data: { consumedAt: now } }),
    prisma.user.update({
      where: { id: userId },
      data: { passwordSetAt: now, schoolEmailConfirmedAt: now },
    }),
  ]);
  return { ok: true };
}
