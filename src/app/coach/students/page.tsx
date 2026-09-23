import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { gradesFromSearch, isAllGrades } from "@/lib/grades";
import { parseGenderParam } from "@/lib/gender";
import { getClassRoster, listSchoolClasses } from "@/lib/queries/roster";
import { RosterTable } from "@/components/athletes/roster-table";
import { AddStudentForm } from "@/components/athletes/add-student-form";
import {
  RosterFiltersDesktop,
  RosterToolbar,
} from "@/components/athletes/roster-toolbar";
import { ImportRosterForm } from "@/components/roster/import-roster-form";
import { prisma } from "@/lib/db";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string;
    grades?: string;
    gender?: string;
    q?: string;
    classId?: string;
    type?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const participationType =
    sp.type === "PE" || sp.type === "ATHLETE" ? sp.type : undefined;
  const classes = await listSchoolClasses(session.schoolId);
  const hourClasses = classes.filter((c) => c.period && !c.name.startsWith("Class of"));
  const roster = await getClassRoster(session.schoolId, grades, gender, {
    classId: sp.classId,
    participationType,
  });
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { slug: true },
  });

  const q = sp.q?.trim().toLowerCase();
  const athletes = q
    ? roster.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.studentNumber.toLowerCase().includes(q) ||
          (a.sports ?? "").toLowerCase().includes(q) ||
          (a.className ?? "").toLowerCase().includes(q)
      )
    : roster;
  const emptyRoster = athletes.length === 0 && !q && !sp.classId && !participationType;

  const searchPool = roster.map((a) => ({
    studentId: a.studentId,
    fullName: a.fullName,
    studentNumber: a.studentNumber,
    sports: a.sports,
    className: a.className,
    classYear: a.classYear,
  }));

  const classOptions = hourClasses.length ? hourClasses : classes;

  return (
    <AppShell title="Roster" nav={COACH_NAV}>
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <RosterToolbar
              searchPool={searchPool}
              hourClasses={classOptions}
              resultCount={athletes.length}
            />
          </div>
          <div className="hidden shrink-0 sm:block">
            <AddStudentForm classes={classOptions} />
          </div>
        </div>
      </div>

      <RosterFiltersDesktop
        hourClasses={classOptions}
        resultCount={athletes.length}
        grades={grades}
        gender={gender}
      />

      <RosterTable athletes={athletes} showClass={!isAllGrades(grades) ? grades.length > 1 : true} />
      {emptyRoster && (
        <div className="mt-6 max-w-2xl">
          <p className="mb-3 text-sm text-muted">
            {school?.slug === "jhs"
              ? "JHS has no students yet. Upload a spreadsheet to load weightlifting class rosters."
              : "No students on this roster yet. Add one above or import a spreadsheet."}
          </p>
          <ImportRosterForm />
        </div>
      )}
      {!emptyRoster && athletes.length === 0 && (
        <p className="mt-4 max-w-xl text-sm text-muted">
          No students match these filters. Add a student above, or clear the hour / type filters.
        </p>
      )}
    </AppShell>
  );
}
