import { prisma } from "@/lib/db";

/** Replace class coach assignments. Lead coachId = first id (or null). */
export async function setClassCoaches(classId: string, schoolId: string, coachIds: string[]) {
  const unique = [...new Set(coachIds.map((id) => id.trim()).filter(Boolean))];

  if (unique.length > 0) {
    const valid = await prisma.coachProfile.findMany({
      where: { schoolId, id: { in: unique } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((v) => v.id));
    const ordered = unique.filter((id) => validIds.has(id));
    if (ordered.length !== unique.length) {
      throw new Error("One or more coaches are not at this school");
    }

    await prisma.$transaction([
      prisma.classCoach.deleteMany({ where: { classId } }),
      prisma.classCoach.createMany({
        data: ordered.map((coachId) => ({ classId, coachId })),
      }),
      prisma.class.update({
        where: { id: classId },
        data: { coachId: ordered[0] ?? null },
      }),
    ]);
    return ordered;
  }

  await prisma.$transaction([
    prisma.classCoach.deleteMany({ where: { classId } }),
    prisma.class.update({
      where: { id: classId },
      data: { coachId: null },
    }),
  ]);
  return [] as string[];
}

export function parseCoachIds(body: unknown): string[] | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const raw = (body as { coachIds?: unknown; coachId?: unknown }).coachIds;
  if (raw !== undefined) {
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => String(id ?? "").trim()).filter(Boolean);
  }
  const single = (body as { coachId?: unknown }).coachId;
  if (single !== undefined) {
    const id = single == null || single === "" ? "" : String(single).trim();
    return id ? [id] : [];
  }
  return undefined;
}

/** Backfill ClassCoach from legacy Class.coachId for rows missing assignments. */
export async function ensureClassCoachRowsFromLead(schoolId?: string) {
  const classes = await prisma.class.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
      coachId: { not: null },
      coachAssignments: { none: {} },
    },
    select: { id: true, coachId: true },
  });
  for (const cls of classes) {
    if (!cls.coachId) continue;
    await prisma.classCoach.create({
      data: { classId: cls.id, coachId: cls.coachId },
    }).catch(() => undefined);
  }
}
