import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { signSessionToken } from "@/lib/auth/session";
import { findUserByCredential } from "@/lib/auth/credentials-login";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  createAccountFromClassJoin,
  findClassStudentByCredential,
  identifyClassStudent,
  previewClassJoin,
} from "@/lib/services/class-join";
import { classIdFromJoinToken } from "@/lib/services/class-join-link";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const preview = await previewClassJoin(token);
  if (!preview) return NextResponse.json({ error: "This class link is not valid." }, { status: 404 });
  return NextResponse.json(preview);
}

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token ?? "").trim();
  const credential = String(body.credential ?? "").trim();
  const action = String(body.action ?? "identify");

  if (!token || !credential) {
    return NextResponse.json({ error: "Enter the email on your roster." }, { status: 400 });
  }

  if (action === "identify") {
    const identified = await identifyClassStudent(token, credential);
    if (!identified.ok) return NextResponse.json({ error: identified.error }, { status: 404 });
    return NextResponse.json(identified);
  }

  if (action === "create") {
    const password = String(body.password ?? "");
    const passwordConfirm = String(body.passwordConfirm ?? "");
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    const created = await createAccountFromClassJoin({ token, credential, password });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });
    return sessionResponse(created.userId, created.studentId, created.schoolId, created.username);
  }

  if (action === "login") {
    const classId = classIdFromJoinToken(token);
    if (!classId) return NextResponse.json({ error: "This class link is not valid." }, { status: 400 });
    const student = await findClassStudentByCredential(classId, credential);
    if (!student?.passwordSetAt) {
      return NextResponse.json(
        { error: "Create your account before signing in." },
        { status: 400 }
      );
    }
    const user = await findUserByCredential(credential);
    if (!user || user.studentProfile?.id !== student.id) {
      return NextResponse.json({ error: "That email is not on this class roster." }, { status: 401 });
    }
    const password = String(body.password ?? "");
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "That password does not match." }, { status: 401 });
    }
    return sessionResponse(user.id, student.id, student.schoolId, student.username ?? student.studentNumber);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function sessionResponse(userId: string, studentId: string, schoolId: string, username: string) {
  const token = await signSessionToken({
    userId,
    role: "STUDENT",
    schoolId,
    studentId,
  });
  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, opts);
  const res = NextResponse.json({
    ok: true,
    username,
    redirect: loginDestination("STUDENT", "/student"),
  });
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
