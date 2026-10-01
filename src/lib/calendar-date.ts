/**
 * Calendar-date helpers for coach/school event days.
 *
 * Athletic chronology uses two clocks:
 * - testingDate / scheduledDate: the coach-chosen calendar day of the event
 * - recordedAt / createdAt / completedAt: server wall-clock when data was written
 *
 * Event days are stored as noon UTC on that YYYY-MM-DD so day boundaries do not
 * shift when the app server TZ changes (common on Railway vs local Docker).
 */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD into a Date at 12:00:00.000Z. Returns null if invalid. */
export function calendarDateAtNoonUtc(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  const m = DAY_RE.exec(trimmed);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Format a Date as YYYY-MM-DD in UTC (stable calendar key). */
export function toCalendarDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD in UTC. Prefer school TZ later; UTC keeps servers consistent. */
export function todayCalendarDateString(): string {
  return toCalendarDateString(new Date());
}
