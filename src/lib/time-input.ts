/** Timed tests coaches enter as m:ss (e.g. Field Killer 2:55). */

export function usesMinuteSecondDisplay(
  unit: string,
  activitySlug?: string,
  activityName?: string
): boolean {
  if (unit === "time_mmss") return true;
  if (unit !== "seconds") return false;
  const hay = `${activitySlug ?? ""} ${activityName ?? ""}`.toLowerCase();
  return (
    hay.includes("field killer") ||
    hay.includes("field-killer") ||
    /(\d+\s*min|minute|timed|duration|shuttle|beep)/.test(hay)
  );
}

/** Parse plain seconds or `m:ss` / `m:s` into total seconds. */
export function parseDurationInput(
  raw: string | number | null,
  unit?: string
): number | null {
  if (raw === "" || raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const t = String(raw).trim();
  if (!t) return null;
  if (t.includes(":")) {
    const [minPart, secPart] = t.split(":");
    const min = Number(minPart);
    const sec = Number(secPart);
    if (Number.isFinite(min) && Number.isFinite(sec) && sec >= 0) {
      return min * 60 + sec;
    }
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  // Bare integer for mm:ss KPIs is treated as minutes (e.g. "9" → 9:00).
  if (unit === "time_mmss" && Number.isInteger(n) && !t.includes(".")) {
    return n * 60;
  }
  return n;
}

export function formatMinuteSecond(value: number): string {
  const total = Math.max(0, value);
  const min = Math.floor(total / 60);
  const sec = Math.round(total % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function parseAttemptInput(
  raw: string | number | null,
  unit?: string,
  activitySlug?: string,
  activityName?: string
): number | null {
  if (usesMinuteSecondDisplay(unit ?? "", activitySlug, activityName)) {
    return parseDurationInput(raw, unit);
  }
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
