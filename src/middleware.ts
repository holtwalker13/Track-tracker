import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt, jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

async function getRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      return typeof payload.role === "string" ? payload.role : null;
    } catch {
      return null;
    }
  }

  // Docker/Railway builds middleware without SESSION_SECRET, so Edge inlining
  // leaves it empty. Decode for routing only; pages still verify the JWT.
  try {
    const payload = decodeJwt(token);
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const role = await getRole(request);
  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/coach") && role !== "COACH" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/student", request.url));
  }
  if (pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/coach", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
