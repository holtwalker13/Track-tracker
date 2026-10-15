import { createHmac, timingSafeEqual } from "crypto";

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

/** Stable class link. No database row — the signature is the credential. */
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

export function classJoinPath(classId: string): string {
  const params = new URLSearchParams({ token: classJoinToken(classId) });
  return `/join/class?${params.toString()}`;
}
