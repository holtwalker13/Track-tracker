import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE = "sap_session";

/** Cookie flags that work on Railway HTTPS and local HTTP. */
export function sessionCookieOptions(
  maxAge = 60 * 60 * 24 * 7,
  request?: Request
): Partial<ResponseCookie> {
  const proto = request?.headers.get("x-forwarded-proto");
  const secure =
    proto === "https" ||
    (!proto && process.env.NODE_ENV === "production");

  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  };
}
