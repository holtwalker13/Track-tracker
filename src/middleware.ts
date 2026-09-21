import { NextResponse } from "next/server";

/**
 * Auth is enforced in server pages/API via requireSession — not in Edge middleware.
 * JWT verification here was redirecting logged-in users to /login on client-side
 * navigations (e.g. top nav) on Railway.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
