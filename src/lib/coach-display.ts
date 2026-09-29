export type ClassCoachOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function coachDisplayName(c: Pick<ClassCoachOption, "firstName" | "lastName">) {
  return `${c.firstName} ${c.lastName}`.trim() || "Coach";
}
