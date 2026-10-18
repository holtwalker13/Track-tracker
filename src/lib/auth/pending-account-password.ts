import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const BCRYPT_ROUNDS = 12;

/** Placeholder hash until the student sets a password after email verification. */
export async function hashPendingAccountPlaceholder(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("base64url"), BCRYPT_ROUNDS);
}
