/** Where a successful sign-in should land. Students never enter coach or admin screens. */
export function loginDestination(role: string, nextRaw: string | undefined | null): string {
  const next = (nextRaw ?? "").trim();
  const relative =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login");

  if (role === "STUDENT") {
    if (relative && (next === "/student" || next.startsWith("/student/"))) return next;
    return "/student";
  }

  if (relative) {
    if (role !== "ADMIN" && (next === "/admin" || next.startsWith("/admin/"))) {
      return "/coach/school/roster";
    }
    return next;
  }

  if (role === "ADMIN") return "/admin";
  return "/coach/school/roster";
}
