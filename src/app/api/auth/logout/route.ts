import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, relativeRedirect } from "@/lib/auth/cookie";

function clearSessionResponse(path = "/login") {
  const opts = { ...sessionCookieOptions(), maxAge: 0 };
  const res = relativeRedirect(path, 303);
  res.cookies.set(SESSION_COOKIE, "", opts);
  return res;
}

/** POST only — a GET logout is unsafe because Next.js Link prefetches it and clears the session. */
export async function POST() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return clearSessionResponse("/login");
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Logout requires POST. Use the Sign out button — do not open /api/auth/logout as a link.",
    },
    { status: 405 }
  );
}
