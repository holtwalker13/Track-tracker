import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

/** Internal dev tools — ADMIN role only (includes developer demo admin accounts). */
export async function requireInternalToolAccess() {
  const session = await requireSession(["ADMIN"]);
  if (!session) redirect("/login?next=/internal/user-flows");
  return session;
}
