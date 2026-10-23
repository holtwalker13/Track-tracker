/** Where a successful sign-in should land. Students never enter coach or admin screens. */
export function loginDestination(role: string, nextRaw: string | undefined | null): string {
  const next = (nextRaw ?? "").trim();
  const relative =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login");

  const path = next.split("?")[0] ?? "";
  if (role === "STUDENT") {
    if (relative && (path === "/student" || path.startsWith("/student/"))) return next;
    return "/student";
  }

  if (relative) {
    if (role !== "ADMIN" && (next === "/admin" || next.startsWith("/admin/"))) {
      return "/coach/programs";
    }
    return next;
  }

  if (role === "ADMIN") return "/admin";
  return "/coach/programs";
}
