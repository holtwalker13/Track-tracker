/** Default district report KPIs when the admin has not chosen any. */
export const DEFAULT_DISTRICT_REPORT_METRIC_SLUGS = [
  "sit-and-reach",
  "pull-ups",
  "mile-run",
] as const;

/** @deprecated Use DEFAULT_DISTRICT_REPORT_METRIC_SLUGS */
export const PE_FITNESS_METRIC_SLUGS = DEFAULT_DISTRICT_REPORT_METRIC_SLUGS;

export type PeFitnessMetricSlug = (typeof PE_FITNESS_METRIC_SLUGS)[number];

export function semesterLabel(testingDate: Date): string {
  const month = testingDate.getUTCMonth() + 1;
  const year = testingDate.getUTCFullYear();
  if (month >= 8) return `Fall ${year}`;
  if (month <= 5) return `Spring ${year}`;
  return `Summer ${year}`;
}

export function semesterSortKey(label: string): number {
  const m = label.match(/^(Fall|Spring|Summer)\s+(\d{4})$/);
  if (!m) return 0;
  const season = m[1] === "Fall" ? 0 : m[1] === "Spring" ? 1 : 2;
  return Number(m[2]) * 10 + season;
}
