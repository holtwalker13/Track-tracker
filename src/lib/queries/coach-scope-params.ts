import type { SessionPayload } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { readCoachClassContextCookie } from "@/lib/coach-class-context";
import { prisma } from "@/lib/db";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";
import { listClassesForCoach, listSchoolCoaches } from "@/lib/queries/programs-hub";

export type ResolvedCoachClassScope = {
  coachId: string;
  classId: string;
  subgroupId: string | null;
  coaches: { id: string; firstName: string; lastName: string }[];
  classes: { id: string; name: string; period: string | null }[];
  subgroups: { id: string; name: string }[];
};

/** Resolve coach/class/subgroup from URL for feature-scoped selectors (not global header). */
export async function resolveCoachClassScopeFromParams(
  session: SessionPayload & { schoolId: string },
  params: { coachId?: string; classId?: string; subgroupId?: string },
  opts?: { defaultClassId?: boolean; preferPersisted?: boolean }
): Promise<ResolvedCoachClassScope> {
  const defaultClassId = opts?.defaultClassId !== false;
  const preferPersisted = opts?.preferPersisted !== false;
  const persisted = preferPersisted ? await readCoachClassContextCookie() : null;

  const coaches = await listSchoolCoaches(session.schoolId);
  const myProfile = await coachProfileForSession(session);

  const coachFromUrl =
    params.coachId && coaches.some((c) => c.id === params.coachId) ? params.coachId : undefined;
  const coachFromCookie =
    persisted?.coachId && coaches.some((c) => c.id === persisted.coachId)
      ? persisted.coachId
      : undefined;

  let coachId =
    coachFromUrl ??
    coachFromCookie ??
    (myProfile?.id && coaches.some((c) => c.id === myProfile.id)
      ? myProfile.id
      : coaches[0]?.id ?? "");

  if (session.role === "COACH" && myProfile) {
    coachId = myProfile.id;
  }

  const classes = coachId
    ? await listClassesForCoach(session.schoolId, coachId)
    : [];

  const classFromUrl =
    params.classId !== undefined
      ? params.classId === "all"
        ? "all"
        : params.classId && classes.some((c) => c.id === params.classId)
          ? params.classId
          : undefined
      : undefined;

  const classFromCookie =
    persisted?.classId && classes.some((c) => c.id === persisted.classId)
      ? persisted.classId
      : undefined;

  let classId =
    classFromUrl ??
    classFromCookie ??
    (defaultClassId ? classes[0]?.id ?? "" : "");

  if (classId === "all") {
    /* school-wide aggregate — no class row */
  } else if (classId && !classes.some((c) => c.id === classId)) {
    classId = defaultClassId ? classes[0]?.id ?? "" : "";
  }

  const subgroupsRaw = classId && classId !== "all" ? await listClassSubgroups(classId) : [];
  const subgroups = subgroupsRaw.map((s) => ({ id: s.id, name: s.name }));

  const subgroupFromUrl =
    params.subgroupId !== undefined
      ? params.subgroupId && subgroups.some((s) => s.id === params.subgroupId)
        ? params.subgroupId
        : null
      : undefined;

  const subgroupFromCookie =
    persisted?.subgroupId && subgroups.some((s) => s.id === persisted.subgroupId)
      ? persisted.subgroupId
      : null;

  const subgroupId: string | null =
    subgroupFromUrl !== undefined ? subgroupFromUrl : subgroupFromCookie;

  return {
    coachId,
    classId,
    subgroupId,
    coaches,
    classes,
    subgroups,
  };
}

export async function studentIdsForClassScope(
  classId: string,
  subgroupId: string | null
): Promise<string[] | null> {
  if (!subgroupId) return null;
  const members = await prisma.classSubgroupMember.findMany({
    where: { subgroupId },
    select: { studentId: true },
  });
  return members.map((m) => m.studentId);
}
