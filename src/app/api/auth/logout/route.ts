import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions, relativeRedirect } from "@/lib/auth/cookie";

export async function GET() {
  const opts = { ...sessionCookieOptions(), maxAge: 0 };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", opts);
  const res = relativeRedirect("/login", 303);
  res.cookies.set(SESSION_COOKIE, "", opts);
  return res;
}
