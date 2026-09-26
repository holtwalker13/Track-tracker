/** UI grouping for the school lift library (not a DB column for catalog lifts). */

export type LiftBodyGroup = "legs" | "back" | "arms" | "other";

export const LIFT_BODY_GROUPS: {
  id: LiftBodyGroup;
  label: string;
  hint: string;
}[] = [
  { id: "legs", label: "Legs", hint: "Squat, clean, hinge" },
  { id: "back", label: "Back", hint: "Pull, row, pull-ups" },
  { id: "arms", label: "Arms / push", hint: "Bench, press, curl" },
  { id: "other", label: "Other", hint: "Accessories, custom" },
];

const DESC_PREFIX = "liftGroup:";

export function liftGroupFromDescription(description: string | null | undefined): LiftBodyGroup | null {
  if (!description?.startsWith(DESC_PREFIX)) return null;
  const id = description.slice(DESC_PREFIX.length).split(/\s/)[0]?.trim();
  if (id === "legs" || id === "back" || id === "arms" || id === "other") return id;
  return null;
}

export function descriptionForLiftGroup(group: LiftBodyGroup): string {
  return `${DESC_PREFIX}${group}`;
}

const SLUG_GROUP: Record<string, LiftBodyGroup> = {
  squat: "legs",
  "squat-relative": "legs",
  "hang-clean": "legs",
  "hang-clean-relative": "legs",
  "bench-press": "arms",
  "pull-ups": "back",
};

export function resolveLiftBodyGroup(input: {
  slug: string;
  name: string;
  description?: string | null;
}): LiftBodyGroup {
  const fromDesc = liftGroupFromDescription(input.description);
  if (fromDesc) return fromDesc;
  const fromSlug = SLUG_GROUP[input.slug];
  if (fromSlug) return fromSlug;
  const n = input.name.toLowerCase();
  if (/squat|clean|dead|lunge|leg|rdl|hinge/.test(n)) return "legs";
  if (/pull|row|lat|back|chin/.test(n)) return "back";
  if (/bench|press|curl|tricep|shoulder|push|dip/.test(n)) return "arms";
  return "other";
}

export function groupLifts<T extends { slug: string; name: string; bodyGroup: LiftBodyGroup }>(
  lifts: T[]
): Record<LiftBodyGroup, T[]> {
  const out: Record<LiftBodyGroup, T[]> = {
    legs: [],
    back: [],
    arms: [],
    other: [],
  };
  for (const l of lifts) {
    out[l.bodyGroup].push(l);
  }
  return out;
}
