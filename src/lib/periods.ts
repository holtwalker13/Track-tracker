/** Central-time school-day period helpers for testing defaults. */

export const PERIOD_LABELS = [
  "Period 1",
  "Period 2",
  "Period 3",
  "Period 4",
  "Period 5",
] as const;

/** Guess period 1–5 from America/Chicago wall-clock hour. */
export function guessPeriodNumber(now = new Date()): number {
  const hourStr = now.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourStr, 10);
  if (!Number.isFinite(hour)) return 1;
  if (hour < 9) return 1;
  if (hour < 10) return 2;
  if (hour < 11) return 3;
  if (hour < 12) return 4;
  return 5;
}

export function guessPeriodLabel(now = new Date()) {
  return PERIOD_LABELS[guessPeriodNumber(now) - 1] ?? "Period 1";
}

/** Graduating-cohort classes (student metric) — not PE/section classes for testing. */
export function isGraduatingClassName(name: string) {
  return /^class of\s+\d{4}$/i.test(name.trim());
}

/** Display label for a PE / hour / semester section. */
export function classSectionLabel(c: { name: string; period: string | null }) {
  if (c.period && c.name) {
    if (c.name.toLowerCase().includes(c.period.toLowerCase())) return c.name;
    return `${c.period} · ${c.name}`;
  }
  return c.period || c.name;
}

/** Match a class to the guessed period (Period N / Nth Hour / etc.). */
export function findClassForPeriod<T extends { id: string; name: string; period: string | null }>(
  classes: T[],
  periodNum = guessPeriodNumber()
): T | null {
  const patterns = [
    new RegExp(`\\bperiod\\s*${periodNum}\\b`, "i"),
    new RegExp(`\\b${periodNum}(st|nd|rd|th)\\s*hour\\b`, "i"),
    new RegExp(`^${periodNum}$`),
  ];
  const hit = classes.find((c) => {
    const hay = `${c.period ?? ""} ${c.name}`;
    return patterns.some((re) => re.test(hay));
  });
  return hit ?? classes[0] ?? null;
}
