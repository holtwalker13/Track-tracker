import {
  LEADERBOARD_PERIODS,
  parseLeaderboardPeriod,
  periodLabel,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-periods";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { parseGradesParam, GRADE_LEVELS } from "@/lib/grades";

export type CommittedLeaderboardQuery = {
  coachId: string;
  classId: string;
  subgroupId: string | null;
  eventSlug: string;
  period: LeaderboardPeriod;
  gender: "M" | "F";
  scope: "school" | "global";
  grades: number[];
};

export type DraftGroupSelection = {
  coachId: string;
  classId: string;
  subgroupId: string;
};

export type DraftFilterSelection = {
  period: LeaderboardPeriod;
  gender: "M" | "F";
  scope: "school" | "global";
  grades: number[];
};

const RESULT_MODE_LABEL = "Best mark";

export function parseLeaderboardSearchParams(
  sp: URLSearchParams,
  defaults: {
    coachId: string;
    classId: string;
    subgroupId: string | null;
    eventSlug?: string;
  }
): CommittedLeaderboardQuery {
  const gradesRaw = sp.get("grades") ?? sp.get("grade");
  const grades = parseGradesParam(gradesRaw);
  const gender = parseGenderParam(sp.get("gender") ?? undefined);
  const scope = sp.get("scope") === "global" ? "global" : "school";
  const period = parseLeaderboardPeriod(sp.get("period") ?? undefined);
  const eventSlug = sp.get("event")?.trim() || defaults.eventSlug || "";

  const classIdRaw = sp.get("classId");
  const classId =
    classIdRaw === "all"
      ? "all"
      : classIdRaw && classIdRaw !== ""
        ? classIdRaw
        : defaults.classId;

  const coachId =
    sp.get("coachId") && sp.get("coachId") !== ""
      ? sp.get("coachId")!
      : defaults.coachId;

  const subgroupRaw = sp.get("subgroupId");
  const subgroupId =
    subgroupRaw && subgroupRaw !== "" ? subgroupRaw : defaults.subgroupId;

  return {
    coachId,
    classId,
    subgroupId,
    eventSlug,
    period,
    gender,
    scope,
    grades,
  };
}

export function buildLeaderboardSearchParams(
  query: CommittedLeaderboardQuery,
  base?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");

  if (query.coachId) params.set("coachId", query.coachId);
  else params.delete("coachId");

  if (query.classId === "all") params.set("classId", "all");
  else if (query.classId) params.set("classId", query.classId);
  else params.delete("classId");

  if (query.subgroupId) params.set("subgroupId", query.subgroupId);
  else params.delete("subgroupId");

  if (query.eventSlug) params.set("event", query.eventSlug);
  else params.delete("event");

  if (query.period !== "semester") params.set("period", query.period);
  else params.delete("period");

  if (query.gender === "M") params.set("gender", "M");
  else params.delete("gender");

  if (query.scope === "global") params.set("scope", "global");
  else params.delete("scope");

  if (query.grades.length > 0 && query.grades.length < GRADE_LEVELS.length) {
    params.set("grades", query.grades.join(","));
    params.delete("grade");
  } else {
    params.delete("grades");
    params.delete("grade");
  }

  return params;
}

export function filterSummaryShort(query: Pick<
  CommittedLeaderboardQuery,
  "period" | "gender" | "scope"
>): string {
  const periodShort =
    LEADERBOARD_PERIODS.find((p) => p.id === query.period)?.shortLabel ??
    periodLabel(query.period);
  const division = genderFullLabel(query.gender);
  const parts = [periodShort, division, RESULT_MODE_LABEL];
  if (query.scope === "global") parts.splice(1, 0, "Global");
  return parts.join(" · ");
}

export function markColumnLabel(): string {
  return RESULT_MODE_LABEL.toUpperCase();
}

export function reconcileDraftGroup(
  draft: DraftGroupSelection,
  options: {
    coaches: { id: string }[];
    classes: { id: string }[];
    subgroups: { id: string }[];
    allClassesValue?: string;
  }
): DraftGroupSelection {
  let coachId = draft.coachId;
  if (!options.coaches.some((c) => c.id === coachId)) {
    coachId = options.coaches[0]?.id ?? "";
  }

  let classId = draft.classId;
  const classAllowed =
    options.allClassesValue && classId === options.allClassesValue
      ? true
      : options.classes.some((c) => c.id === classId);
  if (!classAllowed) {
    classId = options.allClassesValue ?? options.classes[0]?.id ?? "";
  }

  let subgroupId = draft.subgroupId;
  if (subgroupId && !options.subgroups.some((s) => s.id === subgroupId)) {
    subgroupId = "";
  }

  return { coachId, classId, subgroupId };
}

export function reconcileDraftFilters(
  draft: DraftFilterSelection,
  lockedGender?: "M" | "F"
): DraftFilterSelection {
  const gender = lockedGender ?? draft.gender;
  let grades = draft.grades;
  if (grades.length === 0) grades = [...GRADE_LEVELS];
  return { ...draft, gender, grades };
}

export function queryRequestKey(query: CommittedLeaderboardQuery): string {
  return [
    query.coachId,
    query.classId,
    query.subgroupId ?? "",
    query.eventSlug,
    query.period,
    query.gender,
    query.scope,
    query.grades.join(","),
  ].join("|");
}
