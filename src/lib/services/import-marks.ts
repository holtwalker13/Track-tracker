import { prisma } from "@/lib/db";
import { parseCsv, headerIndex, normalizeHeader } from "@/lib/csv";
import { formatActivityValue, ageAtDate } from "@/lib/format";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import {
  calculatePersonalRecord,
  pickBestAttempt,
} from "@/lib/services/performance";
import type { ScoringDirection } from "@/lib/constants";

export async function listImportableActivities(schoolId: string) {
  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId },
    select: { metricSlug: true },
  });
  const hiddenSet = new Set(hidden.map((h) => h.metricSlug));

  const [catalog, custom] = await Promise.all([
    prisma.activity.findMany({
      where: {
        schoolId: null,
        slug: { notIn: ["height", "weight", ...[...hiddenSet]] },
      },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  const catalogKeep = catalog.filter(
    (a) => KPI_METRIC_META.some((m) => m.slug === a.slug) && !hiddenSet.has(a.slug)
  );
  return [...catalogKeep, ...custom];
}

export function marksTemplateCsv(
  activities: { name: string }[]
): string {
  const headers = ["studentNumber", "testingDate", ...activities.map((a) => a.name)];
  return `${headers.map(csvCell).join(",")}\n`;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDay(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3]!.length === 2 ? `20${slash[3]}` : slash[3]!;
    const m = slash[1]!.padStart(2, "0");
    const d = slash[2]!.padStart(2, "0");
    return new Date(`${year}-${m}-${d}T12:00:00`);
  }
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function importHistoricalMarks(input: {
  schoolId: string;
  organizationId: string;
  enteredById?: string;
  csvText: string;
}) {
  const activities = await listImportableActivities(input.schoolId);
  const byName = new Map(activities.map((a) => [normalizeHeader(a.name), a]));
  const bySlug = new Map(activities.map((a) => [normalizeHeader(a.slug), a]));

  const rows = parseCsv(input.csvText);
  if (rows.length < 2) {
    return { error: "CSV needs a header row and at least one data row." as const };
  }
  const header = rows[0]!;
  const numberIdx = headerIndex(header, ["studentNumber", "id", "studentid"]);
  const dateIdx = headerIndex(header, ["testingDate", "date", "testdate"]);
  if (numberIdx < 0 || dateIdx < 0) {
    return { error: "CSV must include studentNumber and testingDate columns." as const };
  }

  const metricCols: { index: number; activityId: string; slug: string; unit: string }[] = [];
  const unknown: string[] = [];
  header.forEach((label, index) => {
    if (index === numberIdx || index === dateIdx) return;
    const key = normalizeHeader(label);
    if (!key || key === "firstname" || key === "lastname") return;
    const act = byName.get(key) ?? bySlug.get(key);
    if (!act) {
      unknown.push(label);
      return;
    }
    metricCols.push({ index, activityId: act.id, slug: act.slug, unit: act.unit });
  });
  if (metricCols.length === 0) {
    return {
      error:
        "No KPI columns matched your builder. Download the template so headers use your exact event names." as const,
      unknown,
    };
  }

  const years = await prisma.schoolYear.findMany({
    where: { schoolId: input.schoolId },
    orderBy: { startDate: "asc" },
  });
  const currentYear = years.find((y) => y.isCurrent) ?? years[years.length - 1];
  if (!currentYear) {
    return { error: "No school year is set up for this school." as const };
  }

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: input.schoolId },
    include: { enrollments: true },
  });
  const studentByNumber = new Map(students.map((s) => [s.studentNumber.trim().toLowerCase(), s]));

  let imported = 0;
  let skippedMissingStudent = 0;
  let skippedBadDate = 0;
  const missingNumbers = new Set<string>();

  for (const row of rows.slice(1)) {
    const number = (row[numberIdx] ?? "").trim();
    const date = parseDay(row[dateIdx] ?? "");
    if (!number) continue;
    const student = studentByNumber.get(number.toLowerCase());
    if (!student) {
      skippedMissingStudent += 1;
      missingNumbers.add(number);
      continue;
    }
    if (!date) {
      skippedBadDate += 1;
      continue;
    }
    const year =
      years.find((y) => date >= y.startDate && date <= y.endDate) ?? currentYear;
    const gradeLevel =
      student.enrollments.find((e) => e.schoolYearId === year.id)?.gradeLevel ??
      student.enrollments[0]?.gradeLevel ??
      DEFAULT_CLASS_YEAR;

    for (const col of metricCols) {
      const value = parseNumber(row[col.index] ?? "");
      if (value == null) continue;
      const activity = activities.find((a) => a.id === col.activityId)!;
      const direction = activity.scoringDirection as ScoringDirection;
      const previous = await prisma.performanceResult.findMany({
        where: {
          studentId: student.id,
          activityId: col.activityId,
          status: "COMPLETED",
          isBestAttempt: true,
          resultValue: { not: null },
          testingDate: { lt: date },
        },
        select: { resultValue: true },
      });
      const prevBest = pickBestAttempt(
        previous.map((r) => r.resultValue!).filter((v) => Number.isFinite(v)),
        direction
      );
      const isPr = calculatePersonalRecord(value, prevBest, direction);

      await prisma.performanceResult.create({
        data: {
          studentId: student.id,
          activityId: col.activityId,
          schoolId: input.schoolId,
          schoolYearId: year.id,
          organizationId: input.organizationId,
          gradeLevel,
          resultValue: value,
          displayValue: formatActivityValue(value, col.unit, col.slug),
          attemptNumber: 1,
          isBestAttempt: true,
          isPersonalRecord: isPr,
          testingDate: date,
          status: "COMPLETED",
          enteredById: input.enteredById,
          entryMethod: "IMPORT",
          ageAtTest: ageAtDate(student.dateOfBirth, date),
        },
      });
      imported += 1;
    }
  }

  return {
    imported,
    skippedMissingStudent,
    skippedBadDate,
    unknown,
    missingNumbers: [...missingNumbers].slice(0, 12),
  };
}
