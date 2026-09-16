/** UI grouping for latest results (running / jumping / other). */

export type ActivityDisplayGroup = "running" | "jumping" | "other";

const RUNNING_SLUGS = new Set([
  "40-yard-dash",
  "50-yard-dash",
  "100-meter-dash",
  "mile-run",
  "800-meter-run",
  "shuttle-run",
]);

const JUMPING_SLUGS = new Set(["vertical-jump", "standing-broad-jump"]);

export function activityDisplayGroup(slug: string, categorySlug?: string): ActivityDisplayGroup {
  if (JUMPING_SLUGS.has(slug)) return "jumping";
  if (
    RUNNING_SLUGS.has(slug) ||
    categorySlug === "speed" ||
    categorySlug === "endurance" ||
    categorySlug === "agility"
  ) {
    return "running";
  }
  return "other";
}

export const DISPLAY_GROUP_LABELS: Record<ActivityDisplayGroup, string> = {
  running: "Running",
  jumping: "Jumping",
  other: "Strength & other",
};

export const DISPLAY_GROUP_ORDER: ActivityDisplayGroup[] = ["running", "jumping", "other"];

export const ACTIVITY_ABBR: Record<string, string> = {
  "40-yard-dash": "40YD",
  "50-yard-dash": "50YD",
  "100-meter-dash": "100M",
  "shuttle-run": "SHUT",
  "pro-agility": "5-10-5",
  "standing-broad-jump": "SBJ",
  "vertical-jump": "VJ",
  "bench-press": "BNCH",
  "push-ups": "PUSH",
  "pull-ups": "PULL",
  "squat": "SQT",
  "sit-ups": "SU",
  "plank": "PLK",
  "sit-and-reach": "S&R",
  "mile-run": "MILE",
  "800-meter-run": "800M",
};

export function activityAbbr(slug: string, fallback: string) {
  return ACTIVITY_ABBR[slug] ?? fallback.slice(0, 4).toUpperCase();
}
