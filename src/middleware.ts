import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth is enforced in server pages/API via requireSession — not here.
 * Edge middleware was dropping sessions on Railway (build-time env + absolute
 * redirects to 0.0.0.0). Keep this file only if we need future non-auth middleware.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
