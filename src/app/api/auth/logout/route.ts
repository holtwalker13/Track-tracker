import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";
import { publicUrl } from "@/lib/auth/public-url";

export async function GET(request: Request) {
  const res = NextResponse.redirect(publicUrl(request, "/login"));
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(0, request),
    maxAge: 0,
  });
  return res;
}
