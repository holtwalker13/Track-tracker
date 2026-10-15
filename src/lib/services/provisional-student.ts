import { prisma } from "@/lib/db";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { dayBoundsFromDateString, getOrCreateWorkoutSession } from "@/lib/services/workouts";

function tempStudentNumber() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `TEMP${n}`;
}

export async function createProvisionalStudent(input: {
  schoolId: string;
  classId: string;
  firstName: string;
  lastName: string;
  date?: string | null;
}) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false as const, error: "First and last name are required." };
  }

  const cls = await prisma.class.findFirst({
    where: { id: input.classId, schoolId: input.schoolId },
    select: { id: true },
  });
  if (!cls) return { ok: false as const, error: "Class not found." };

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: input.schoolId, isCurrent: true },
  });
  if (!schoolYear) return { ok: false as const, error: "No current school year." };

  let studentNumber = tempStudentNumber();
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.studentProfile.findFirst({
      where: { schoolId: input.schoolId, studentNumber },
      select: { id: true },
    });
    if (!taken) break;
    studentNumber = tempStudentNumber();
  }

  const student = await prisma.studentProfile.create({
    data: {
      schoolId: input.schoolId,
      studentNumber,
      firstName,
      lastName,
      dateOfBirth: new Date(2010, 0, 1),
      anonymousId: `provisional-${studentNumber.toLowerCase()}`,
      provisional: true,
      enrollments: {
        create: { schoolYearId: schoolYear.id, gradeLevel: DEFAULT_CLASS_YEAR },
      },
      classEnrollments: { create: { classId: cls.id } },
    },
  });

  let sessionId: string | null = null;
  if (input.date) {
    const bounds = dayBoundsFromDateString(input.date);
    if (bounds) {
      const assignment = await prisma.workoutAssignment.findFirst({
        where: {
          schoolId: input.schoolId,
          classId: cls.id,
          scheduledDate: { gte: bounds.start, lte: bounds.end },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (assignment) {
        const session = await getOrCreateWorkoutSession(assignment.id, student.id);
        sessionId = session.id;
      }
    }
  }

  return {
    ok: true as const,
    studentId: student.id,
    sessionId,
    name: `${firstName} ${lastName}`,
  };
}

async function moveUniqueRows(
  rows: { id: string; key: string }[],
  officialKeys: Set<string>,
  reassign: (id: string) => Promise<unknown>,
  remove: (id: string) => Promise<unknown>
) {
  for (const row of rows) {
    if (officialKeys.has(row.key)) await remove(row.id);
    else await reassign(row.id);
  }
}

/**
 * Move a temporary athlete's existing rows onto an official profile.
 * Writes are id updates only — saved marks are not rechecked.
 */
export async function linkProvisionalStudent(input: {
  schoolId: string;
  provisionalStudentId: string;
  officialStudentId: string;
}) {
  if (input.provisionalStudentId === input.officialStudentId) {
    return { ok: false as const, error: "Pick the official student." };
  }

  const [temp, official] = await Promise.all([
    prisma.studentProfile.findFirst({
      where: { id: input.provisionalStudentId, schoolId: input.schoolId, provisional: true },
      select: { id: true, userId: true },
    }),
    prisma.studentProfile.findFirst({
      where: { id: input.officialStudentId, schoolId: input.schoolId, provisional: false },
      select: { id: true },
    }),
  ]);
  if (!temp) return { ok: false as const, error: "Temporary student not found." };
  if (!official) return { ok: false as const, error: "Official student not found." };

  await prisma.$transaction(async (tx) => {
    const tempId = temp.id;
    const officialId = official.id;

    const [tempClasses, officialClasses] = await Promise.all([
      tx.classEnrollment.findMany({ where: { studentId: tempId } }),
      tx.classEnrollment.findMany({ where: { studentId: officialId }, select: { classId: true } }),
    ]);
    const officialClassIds = new Set(officialClasses.map((row) => row.classId));
    await moveUniqueRows(
      tempClasses.map((row) => ({ id: row.id, key: row.classId })),
      officialClassIds,
      (id) => tx.classEnrollment.update({ where: { id }, data: { studentId: officialId } }),
      (id) => tx.classEnrollment.delete({ where: { id } })
    );

    const [tempGroups, officialGroups] = await Promise.all([
      tx.classSubgroupMember.findMany({ where: { studentId: tempId } }),
      tx.classSubgroupMember.findMany({ where: { studentId: officialId }, select: { subgroupId: true } }),
    ]);
    await moveUniqueRows(
      tempGroups.map((row) => ({ id: row.id, key: row.subgroupId })),
      new Set(officialGroups.map((row) => row.subgroupId)),
      (id) => tx.classSubgroupMember.update({ where: { id }, data: { studentId: officialId } }),
      (id) => tx.classSubgroupMember.delete({ where: { id } })
    );

    const [tempTests, officialTests] = await Promise.all([
      tx.testingSessionStudent.findMany({ where: { studentId: tempId } }),
      tx.testingSessionStudent.findMany({ where: { studentId: officialId }, select: { sessionId: true } }),
    ]);
    await moveUniqueRows(
      tempTests.map((row) => ({ id: row.id, key: row.sessionId })),
      new Set(officialTests.map((row) => row.sessionId)),
      (id) => tx.testingSessionStudent.update({ where: { id }, data: { studentId: officialId } }),
      (id) => tx.testingSessionStudent.delete({ where: { id } })
    );

    const [tempYears, officialYears] = await Promise.all([
      tx.studentEnrollment.findMany({ where: { studentId: tempId } }),
      tx.studentEnrollment.findMany({ where: { studentId: officialId }, select: { schoolYearId: true } }),
    ]);
    await moveUniqueRows(
      tempYears.map((row) => ({ id: row.id, key: row.schoolYearId })),
      new Set(officialYears.map((row) => row.schoolYearId)),
      (id) => tx.studentEnrollment.update({ where: { id }, data: { studentId: officialId } }),
      (id) => tx.studentEnrollment.delete({ where: { id } })
    );

    const tempSessions = await tx.workoutSession.findMany({
      where: { studentId: tempId },
      include: { setLogs: true },
    });
    for (const session of tempSessions) {
      const existing = await tx.workoutSession.findUnique({
        where: { assignmentId_studentId: { assignmentId: session.assignmentId, studentId: officialId } },
        select: { id: true },
      });
      if (!existing) {
        await tx.workoutSession.update({ where: { id: session.id }, data: { studentId: officialId } });
        continue;
      }
      for (const log of session.setLogs) {
        const clash = await tx.workoutSetLog.findUnique({
          where: {
            sessionId_templateExerciseId_setNumber: {
              sessionId: existing.id,
              templateExerciseId: log.templateExerciseId,
              setNumber: log.setNumber,
            },
          },
          select: { id: true },
        });
        if (!clash) {
          await tx.workoutSetLog.update({ where: { id: log.id }, data: { sessionId: existing.id } });
        }
      }
      await tx.workoutSession.delete({ where: { id: session.id } });
    }

    await tx.workoutAssignment.updateMany({
      where: { studentId: tempId },
      data: { studentId: officialId },
    });
    await tx.performanceResult.updateMany({
      where: { studentId: tempId },
      data: { studentId: officialId },
    });
    await tx.performanceAuditEvent.updateMany({
      where: { studentId: tempId },
      data: { studentId: officialId },
    });
    await tx.xpTransaction.updateMany({
      where: { studentId: tempId },
      data: { studentId: officialId },
    });

    const [tempAchievements, officialAchievements] = await Promise.all([
      tx.studentAchievement.findMany({ where: { studentId: tempId } }),
      tx.studentAchievement.findMany({ where: { studentId: officialId }, select: { achievementId: true } }),
    ]);
    const officialAchievementIds = new Set(officialAchievements.map((row) => row.achievementId));
    for (const row of tempAchievements) {
      if (officialAchievementIds.has(row.achievementId)) {
        await tx.studentAchievement.delete({ where: { id: row.id } });
      } else {
        await tx.studentAchievement.update({ where: { id: row.id }, data: { studentId: officialId } });
      }
    }

    const [tempAccolades, officialAccolades] = await Promise.all([
      tx.studentAccolade.findMany({ where: { studentId: tempId } }),
      tx.studentAccolade.findMany({ where: { studentId: officialId }, select: { accoladeId: true } }),
    ]);
    const officialAccoladeIds = new Set(officialAccolades.map((row) => row.accoladeId));
    for (const row of tempAccolades) {
      if (officialAccoladeIds.has(row.accoladeId)) {
        await tx.studentAccolade.delete({ where: { id: row.id } });
      } else {
        await tx.studentAccolade.update({ where: { id: row.id }, data: { studentId: officialId } });
      }
    }

    const tempHolders = await tx.dynamicAccoladeHolder.findMany({ where: { studentId: tempId } });
    for (const row of tempHolders) {
      const clash = await tx.dynamicAccoladeHolder.findFirst({
        where: {
          accoladeSlug: row.accoladeSlug,
          scopeType: row.scopeType,
          scopeId: row.scopeId,
          periodType: row.periodType,
          periodKey: row.periodKey,
          id: { not: row.id },
        },
        select: { id: true },
      });
      if (clash) {
        await tx.dynamicAccoladeHolder.delete({ where: { id: row.id } });
      } else {
        await tx.dynamicAccoladeHolder.update({
          where: { id: row.id },
          data: { studentId: officialId },
        });
      }
    }

    const officialGame = await tx.studentGamification.findUnique({ where: { studentId: officialId } });
    if (officialGame) {
      await tx.studentGamification.deleteMany({ where: { studentId: tempId } });
    } else {
      const tempGame = await tx.studentGamification.findUnique({ where: { studentId: tempId } });
      if (tempGame) {
        await tx.studentGamification.delete({ where: { studentId: tempId } });
        await tx.studentGamification.create({
          data: {
            studentId: officialId,
            lifetimeXp: tempGame.lifetimeXp,
            currentStreak: tempGame.currentStreak,
            longestStreak: tempGame.longestStreak,
          },
        });
      }
    }

    await tx.studentLoginInvite.deleteMany({ where: { studentId: tempId } });
    await tx.studentProfile.delete({ where: { id: tempId } });
    if (temp.userId) {
      const [entered, createdTemplates] = await Promise.all([
        tx.performanceResult.count({ where: { enteredById: temp.userId } }),
        tx.workoutTemplate.count({ where: { createdById: temp.userId } }),
      ]);
      if (entered === 0 && createdTemplates === 0) {
        await tx.user.deleteMany({ where: { id: temp.userId, role: "STUDENT" } });
      }
    }
  });

  return { ok: true as const, studentId: official.id };
}
