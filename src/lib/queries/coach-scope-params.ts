import type { SessionPayload } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
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
  params: { coachId?: string; classId?: string; subgroupId?: string }
): Promise<ResolvedCoachClassScope> {
  const coaches = await listSchoolCoaches(session.schoolId);
  const myProfile = await coachProfileForSession(session);

  let coachId =
    params.coachId && coaches.some((c) => c.id === params.coachId)
      ? params.coachId
      : myProfile?.id && coaches.some((c) => c.id === myProfile.id)
        ? myProfile.id
        : coaches[0]?.id ?? "";

  if (session.role === "COACH" && myProfile) {
    coachId = myProfile.id;
  }

  const classes = coachId
    ? await listClassesForCoach(session.schoolId, coachId)
    : [];

  let classId =
    params.classId && classes.some((c) => c.id === params.classId)
      ? params.classId
      : classes[0]?.id ?? "";

  const subgroupsRaw = classId ? await listClassSubgroups(classId) : [];
  const subgroups = subgroupsRaw.map((s) => ({ id: s.id, name: s.name }));

  let subgroupId: string | null =
    params.subgroupId && subgroups.some((s) => s.id === params.subgroupId)
      ? params.subgroupId
      : null;

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
