import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "sap_session";

/** Cookie flags for Railway HTTPS (and local HTTP in development). */
export function sessionCookieOptions(
  maxAge = 60 * 60 * 24 * 7
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    // Always secure in production — Railway serves HTTPS to the browser.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Relative Location so redirects never target internal hosts like 0.0.0.0. */
export function relativeRedirect(path: string, status = 303): NextResponse {
  const location = path.startsWith("/") ? path : `/${path}`;
  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
}
