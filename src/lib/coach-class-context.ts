import { cookies } from "next/headers";
import type { SessionPayload } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";

export const COACH_CLASS_CONTEXT_COOKIE = "sap_coach_class";

export type CoachClassContextValue = {
  classId: string | null;
  subgroupId: string | null;
};

export type CoachClassOption = {
  id: string;
  name: string;
  period: string | null;
  programKind: string | null;
};

export type CoachClassContextResolved = CoachClassContextValue & {
  classes: CoachClassOption[];
  subgroups: { id: string; name: string; memberIds: string[] }[];
};

function parseContextCookie(raw: string | undefined): CoachClassContextValue {
  if (!raw) return { classId: null, subgroupId: null };
  try {
    const parsed = JSON.parse(raw) as Partial<CoachClassContextValue>;
    return {
      classId: typeof parsed.classId === "string" ? parsed.classId : null,
      subgroupId: typeof parsed.subgroupId === "string" ? parsed.subgroupId : null,
    };
  } catch {
    return { classId: null, subgroupId: null };
  }
}

export async function classesForCoachContext(
  session: SessionPayload & { schoolId: string }
): Promise<CoachClassOption[]> {
  if (session.role === "ADMIN") {
    return prisma.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ period: "asc" }, { name: "asc" }],
      select: { id: true, name: true, period: true, programKind: true },
    });
  }

  const profile = await coachProfileForSession(session);
  if (!profile) return [];

  return prisma.class.findMany({
    where: {
      schoolId: session.schoolId,
      OR: [
        { coachId: profile.id },
        { coachAssignments: { some: { coachId: profile.id } } },
      ],
    },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true, programKind: true },
  });
}

export type ClassContextOverrides = {
  classId?: string | null;
  subgroupId?: string | null;
};

/** Resolve persistent coach class + optional subgroup (URL overrides cookie). */
export async function resolveCoachClassContext(
  session: SessionPayload & { schoolId: string },
  overrides: ClassContextOverrides = {}
): Promise<CoachClassContextResolved> {
  const classes = await classesForCoachContext(session);
  const allowedClassIds = new Set(classes.map((c) => c.id));

  const jar = await cookies();
  const fromCookie = parseContextCookie(jar.get(COACH_CLASS_CONTEXT_COOKIE)?.value);

  let classId =
    overrides.classId !== undefined
      ? overrides.classId
      : fromCookie.classId;

  if (classId && !allowedClassIds.has(classId)) {
    classId = null;
  }
  if (!classId && classes.length === 1) {
    classId = classes[0]!.id;
  }
  if (!classId && classes.length > 0) {
    classId = fromCookie.classId && allowedClassIds.has(fromCookie.classId)
      ? fromCookie.classId
      : classes[0]!.id;
  }

  const subgroups = classId ? await listClassSubgroups(classId) : [];
  const allowedSubgroupIds = new Set(subgroups.map((s) => s.id));

  let subgroupId =
    overrides.subgroupId !== undefined
      ? overrides.subgroupId
      : fromCookie.subgroupId;

  if (subgroupId && !allowedSubgroupIds.has(subgroupId)) {
    subgroupId = null;
  }

  return {
    classId: classId ?? null,
    subgroupId: subgroupId ?? null,
    classes,
    subgroups,
  };
}

export function serializeCoachClassContext(value: CoachClassContextValue): string {
  return JSON.stringify({
    classId: value.classId,
    subgroupId: value.subgroupId,
  });
}
