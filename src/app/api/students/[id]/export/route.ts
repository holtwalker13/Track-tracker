import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCoachOrAdminStudentAccess } from "@/lib/auth/tenant-access";
import { writeAuditLog } from "@/lib/security/audit-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const access = await assertCoachOrAdminStudentAccess(session, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.status === 404 ? "Not found" : "Forbidden" }, { status: access.status });
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id, schoolId: session.schoolId },
    include: {
      enrollments: { include: { schoolYear: true } },
      classEnrollments: { include: { class: { select: { id: true, name: true } } } },
      performanceResults: {
        where: { status: "COMPLETED", isBestAttempt: true },
        take: 500,
        orderBy: { testingDate: "desc" },
        include: { activity: { select: { slug: true, name: true, unit: true } } },
      },
      achievements: { include: { achievement: true }, take: 100 },
    },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "STUDENT_DATA_EXPORT",
    targetType: "StudentProfile",
    targetId: id,
    metadata: { resultCount: student.performanceResults.length },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    student: {
      id: student.id,
      studentNumber: student.studentNumber,
      username: student.username,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
      gender: student.gender,
      enrollments: student.enrollments.map((e) => ({
        schoolYear: e.schoolYear.label,
        gradeLevel: e.gradeLevel,
      })),
      classes: student.classEnrollments.map((c) => c.class),
    },
    performanceResults: student.performanceResults.map((r) => ({
      activity: r.activity.slug,
      activityName: r.activity.name,
      unit: r.activity.unit,
      value: r.resultValue,
      testingDate: r.testingDate.toISOString().slice(0, 10),
      isPersonalRecord: r.isPersonalRecord,
    })),
    achievements: student.achievements.map((a) => ({
      name: a.achievement.name,
      earnedAt: a.earnedAt.toISOString(),
    })),
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="student-${student.studentNumber}-export.json"`,
    },
  });
}
