import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const res = NextResponse.redirect(new URL("/login", origin));
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(0, request),
    maxAge: 0,
  });
  return res;
}
