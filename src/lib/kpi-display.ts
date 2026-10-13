import { KPI_UNITS } from "@/lib/age-brackets";
import { formatActivityValue } from "@/lib/format";

/** Short unit label for compact mobile target cards. */
export function kpiUnitShort(unit: string): string {
  if (unit === "seconds") return "s";
  if (unit === "lb") return "lbs";
  if (unit === "x BW") return "× BW";
  if (unit === "inches") return "in";
  if (unit === "reps") return "reps";
  return unit;
}

export function scoringDirectionForUnit(unit: string): "HIGHER_BETTER" | "LOWER_BETTER" {
  const meta = KPI_UNITS.find((u) => u.id === unit);
  return meta?.directionDefault ?? "HIGHER_BETTER";
}

/** Display a medal target with metric-aware precision. */
export function formatKpiTargetValue(
  value: number,
  unit: string,
  slug: string,
  name: string
): string {
  return formatActivityValue(value, unit, slug, name);
}
