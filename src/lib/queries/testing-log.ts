import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";

export type TestingLogSessionOption = {
  id: string;
  name: string;
  testingDate: string;
  label: string;
};

export type TestingLogRow = {
  studentId: string;
  athleteName: string;
  cells: Record<string, string | null>;
};

export async function listTestingLogSessionsForClass(
  schoolId: string,
  classId: string
): Promise<TestingLogSessionOption[]> {
  const sessions = await prisma.testingSession.findMany({
    where: { schoolId, classId, archivedAt: null },
    orderBy: { testingDate: "desc" },
    select: { id: true, name: true, testingDate: true },
    take: 100,
  });
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    testingDate: s.testingDate.toISOString().slice(0, 10),
    label: `${s.testingDate.toLocaleDateString()} · ${s.name}`,
  }));
}

/** Scholastic grid: athletes × activities from the session (dynamic columns). */
export async function getTestingLogGrid(sessionId: string, schoolId: string) {
  const session = await prisma.testingSession.findFirst({
    where: { id: sessionId, schoolId, archivedAt: null },
    include: {
      activities: {
        include: { activity: true },
        orderBy: { sortOrder: "asc" },
      },
      students: {
        include: { student: true },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      },
      results: {
        where: { status: { not: "SUPERSEDED" }, isBestAttempt: true },
        select: {
          studentId: true,
          activityId: true,
          displayValue: true,
          resultValue: true,
        },
      },
    },
  });
  if (!session) return null;

  const columns = session.activities.map((a) => ({
    activityId: a.activityId,
    slug: a.activity.slug,
    name: a.activity.name,
    unit: a.activity.unit,
  }));

  const bestByStudentActivity = new Map<string, { display: string | null; value: number | null }>();
  for (const r of session.results) {
    const key = `${r.studentId}:${r.activityId}`;
    const act = session.activities.find((x) => x.activityId === r.activityId)?.activity;
    const display =
      r.displayValue ??
      (r.resultValue != null && act
        ? formatActivityValue(r.resultValue, act.unit, act.slug)
        : null);
    bestByStudentActivity.set(key, { display, value: r.resultValue });
  }

  const rows: TestingLogRow[] = session.students.map((ss) => {
    const cells: Record<string, string | null> = {};
    for (const col of columns) {
      const hit = bestByStudentActivity.get(`${ss.studentId}:${col.activityId}`);
      cells[col.slug] = hit?.display ?? null;
    }
    return {
      studentId: ss.studentId,
      athleteName: `${ss.student.lastName}, ${ss.student.firstName}`,
      cells,
    };
  });

  return {
    session: {
      id: session.id,
      name: session.name,
      testingDate: session.testingDate.toISOString().slice(0, 10),
      classId: session.classId,
    },
    columns,
    rows,
  };
}
