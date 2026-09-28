/** Sports / activities coaches assign to KPI sets. */

export type CoachingSport = {
  id: string;
  name: string;
};

export const COACHING_SPORTS: CoachingSport[] = [
  { id: "track", name: "Track & Field" },
  { id: "cross-country", name: "Cross Country" },
  { id: "weightlifting", name: "Weightlifting" },
  { id: "football", name: "Football" },
  { id: "basketball", name: "Basketball" },
  { id: "volleyball", name: "Volleyball" },
  { id: "soccer", name: "Soccer" },
  { id: "baseball", name: "Baseball" },
  { id: "softball", name: "Softball" },
  { id: "wrestling", name: "Wrestling" },
  { id: "swimming", name: "Swimming" },
  { id: "pe", name: "PE / General" },
  { id: "other", name: "Other" },
];

export function sportLabel(id: string): string {
  return COACHING_SPORTS.find((s) => s.id === id)?.name ?? id;
}

export function isCoachingSportId(id: string): boolean {
  return COACHING_SPORTS.some((s) => s.id === id);
}

/** Normalize free-text student sports field to a known sport id when possible. */
export function matchSportId(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if (!key) return null;
  const exact = COACHING_SPORTS.find((s) => s.id === key || s.name.toLowerCase() === key);
  if (exact) return exact.id;
  for (const s of COACHING_SPORTS) {
    if (key.includes(s.id) || key.includes(s.name.toLowerCase().split(" ")[0]!)) {
      return s.id;
    }
  }
  if (/weight|lift/.test(key)) return "weightlifting";
  if (/pe\b/.test(key)) return "pe";
  return null;
}
