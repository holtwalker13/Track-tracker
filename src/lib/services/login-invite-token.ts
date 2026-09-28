import { createHash, randomBytes } from "crypto";

export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteJoinPath(basePath: string, token: string): string {
  const qs = new URLSearchParams({ token });
  return `${basePath}?${qs.toString()}`;
}

export function validateAccountPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}
