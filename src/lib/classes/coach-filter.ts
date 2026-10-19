/** Server-safe class list filter by coach URL param (?coach=). */

export function classMatchesCoachFilter(
  assignedCoachIds: string[],
  filter: string | undefined
): boolean {
  const coach = filter?.trim() || "all";
  if (coach === "all") return true;
  if (coach === "unassigned") return assignedCoachIds.length === 0;
  return assignedCoachIds.includes(coach);
}
