import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/lib/services/login-invite-token";

export const CLASS_JOIN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ chars)");
  }
  return s;
}

function sign(classId: string): string {
  return createHmac("sha256", secret()).update(`class-join:${classId}`).digest("base64url");
}

/** Legacy stable class link (no expiry). Prefer createSecureClassJoinLink for new QR codes. */
export function classJoinToken(classId: string): string {
  return `${classId}.${sign(classId)}`;
}

export function classIdFromJoinToken(token: string): string | null {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const classId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!classId || !sig) return null;
  const expected = sign(classId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return classId;
}

export function classJoinPathFromToken(token: string): string {
  const params = new URLSearchParams({ token });
  return `/join/class?${params.toString()}`;
}

export function classJoinPath(classId: string): string {
  return classJoinPathFromToken(classJoinToken(classId));
}

/** Resolve class from secure DB token or legacy signed token. */
export async function resolveClassIdFromJoinToken(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (!trimmed.includes(".")) {
    const tokenHash = hashInviteToken(trimmed);
    const link = await prisma.classJoinLink.findUnique({
      where: { tokenHash },
      select: { classId: true, expiresAt: true, revokedAt: true },
    });
    if (!link || link.revokedAt || link.expiresAt.getTime() < Date.now()) return null;
    return link.classId;
  }

  return classIdFromJoinToken(trimmed);
}

export async function createSecureClassJoinLink(
  classId: string,
  createdByUserId?: string,
  ttlMs = CLASS_JOIN_TTL_MS
): Promise<{ token: string; urlPath: string; expiresAt: Date }> {
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.classJoinLink.create({
    data: {
      classId,
      tokenHash,
      expiresAt,
      createdByUserId,
    },
  });
  return { token, urlPath: classJoinPathFromToken(token), expiresAt };
}

export async function revokeClassJoinLink(token: string): Promise<boolean> {
  const tokenHash = hashInviteToken(token.trim());
  const updated = await prisma.classJoinLink.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return updated.count > 0;
}
