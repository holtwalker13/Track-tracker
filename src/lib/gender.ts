export type AthleteGender = "M" | "F";

const MALE_NAMES = new Set([
  "Connor",
  "Noah",
  "Liam",
  "Ethan",
  "Lucas",
]);
const FEMALE_NAMES = new Set(["Emma", "Mia", "Sophia", "Olivia", "Ava"]);

export function genderFromFirstName(firstName: string, index = 0): AthleteGender {
  if (MALE_NAMES.has(firstName)) return "M";
  if (FEMALE_NAMES.has(firstName)) return "F";
  return index % 2 === 0 ? "M" : "F";
}

export function genderShort(gender?: string | null): string {
  if (gender === "M") return "B";
  if (gender === "F") return "G";
  return "—";
}

export function genderGroupLabel(gender?: string | null): string {
  if (gender === "M") return "boys";
  if (gender === "F") return "girls";
  return "peers";
}

export function genderFullLabel(gender?: string | null): string {
  if (gender === "M") return "Boys";
  if (gender === "F") return "Girls";
  return "All";
}

export function parseGenderParam(value?: string | null): "M" | "F" {
  return value === "M" ? "M" : "F";
}
