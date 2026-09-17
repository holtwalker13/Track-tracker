import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, relativeRedirect } from "@/lib/auth/cookie";

export async function GET() {
  const res = relativeRedirect("/login", 303);
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
