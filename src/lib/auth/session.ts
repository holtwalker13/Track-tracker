import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";

export { SESSION_COOKIE, sessionCookieOptions };

export type SessionPayload = {
  userId: string;
  role: UserRole;
  schoolId?: string;
  studentId?: string;
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set");
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await signSessionToken(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(roles?: UserRole[]) {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { coachProfile: true, studentProfile: true },
  });
  if (!user) return null;

  return {
    userId: user.id,
    role: user.role as UserRole,
    schoolId: user.coachProfile?.schoolId ?? user.studentProfile?.schoolId,
    studentId: user.studentProfile?.id,
  };
}
