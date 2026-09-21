import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

function secretKey() {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ chars)");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    schoolId: payload.schoolId,
    studentId: payload.studentId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/** Prefer setting the token on the Route Handler `NextResponse` (see login route). */
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await signSessionToken(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function replaceSession(payload: SessionPayload): Promise<string> {
  return createSession(payload);
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
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role;
    const userId = payload.userId;
    if (typeof role !== "string" || typeof userId !== "string") return null;
    return {
      userId,
      role: role as UserRole,
      schoolId: typeof payload.schoolId === "string" ? payload.schoolId : undefined,
      studentId: typeof payload.studentId === "string" ? payload.studentId : undefined,
    };
  } catch (err) {
    console.error("[auth] session verify failed:", err instanceof Error ? err.message : err);
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
  if (!user) {
    console.error("[auth] session user missing from DB:", session.userId);
    return null;
  }

  let schoolId =
    user.role === "ADMIN"
      ? session.schoolId
      : user.coachProfile?.schoolId ?? user.studentProfile?.schoolId;

  if (user.role === "ADMIN" && schoolId) {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!school) schoolId = undefined;
  }

  const studentId = user.studentProfile?.id ?? session.studentId;

  return {
    userId: user.id,
    role: user.role as UserRole,
    schoolId,
    studentId,
  };
}

export async function requireSchoolSession(roles: UserRole[] = ["COACH", "ADMIN"]) {
  const session = await requireSession(roles);
  if (!session) redirect("/login");
  const schoolId = session.schoolId;
  if (!schoolId) {
    if (session.role === "ADMIN") redirect("/admin");
    redirect("/login");
  }
  return { ...session, schoolId };
}
