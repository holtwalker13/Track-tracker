import bcrypt from "bcryptjs";
import { DEMO_CLASS_LOGIN, DEMO_PASSWORD } from "@/lib/tenants";

export function isSandboxStudentEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (lower === DEMO_CLASS_LOGIN.email) return true;
  return /@(?:demo\.local|jhs\.demo|chs\.demo)$/i.test(lower);
}

/** True when a student still uses the shared demo password outside sandbox domains. */
export async function studentUsesBlockedSharedDemoPassword(user: {
  role: string;
  email: string;
  passwordHash: string;
}): Promise<boolean> {
  if (user.role !== "STUDENT") return false;
  const demoPass = process.env.DEMO_PASSWORD || DEMO_PASSWORD;
  const matchesShared = await bcrypt.compare(demoPass, user.passwordHash);
  if (!matchesShared) return false;
  return !isSandboxStudentEmail(user.email);
}
