export type UserRole = "ADMIN" | "COACH" | "STUDENT";
export type ScoringDirection = "HIGHER_BETTER" | "LOWER_BETTER";
export type ResultStatus =
  | "COMPLETED"
  | "ABSENT"
  | "INJURED"
  | "DNP"
  | "DQ"
  | "SUPERSEDED";
export type EntryMethod =
  | "LIVE_GRID"
  | "STUDENT_STATION"
  | "MANUAL"
  | "IMPORT"
  | "WORKOUT";
export type TestingSessionStatus = "DRAFT" | "LIVE" | "PAUSED" | "CLOSED" | "ACTIVE" | "COMPLETED";

/** Sessions that still accept coach recording (including after close for corrections). */
export function isLiveRecordingOpen(status: string, recordingUnlocked: boolean, liveOpenedAt: Date | null | undefined) {
  if (status === "CLOSED" || status === "COMPLETED") return true;
  if (!recordingUnlocked) return false;
  if (liveOpenedAt) {
    const ms = Date.now() - liveOpenedAt.getTime();
    if (ms > 24 * 60 * 60 * 1000) return false;
  }
  return status === "LIVE" || status === "ACTIVE" || status === "DRAFT" || status === "PAUSED";
}

export function isWithinLiveWindow(liveOpenedAt: Date | null | undefined) {
  if (!liveOpenedAt) return true;
  return Date.now() - liveOpenedAt.getTime() <= 24 * 60 * 60 * 1000;
}
