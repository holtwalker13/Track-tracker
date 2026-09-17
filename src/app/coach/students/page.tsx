import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch, gradesLabel, isAllGrades } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { getClassRoster, listSchoolClasses } from "@/lib/queries/roster";
import { RosterTable } from "@/components/athletes/roster-table";
import { AddStudentForm } from "@/components/athletes/add-student-form";
import { ClassHourPills, ParticipationPills } from "@/components/athletes/roster-filters";

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
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
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

  return (
    <AppShell title="Roster" nav={COACH_NAV}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <form className="flex flex-1 justify-center sm:justify-start">
          {sp.gender && <input type="hidden" name="gender" value={sp.gender} />}
          {sp.grades && <input type="hidden" name="grades" value={sp.grades} />}
          {sp.grade && <input type="hidden" name="grade" value={sp.grade} />}
          {sp.classId && <input type="hidden" name="classId" value={sp.classId} />}
          {sp.type && <input type="hidden" name="type" value={sp.type} />}
          <input
            name="q"
            placeholder="Search name, ID, sport, or class"
            defaultValue={sp.q}
            className="w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </form>
        <AddStudentForm classes={hourClasses.length ? hourClasses : classes} />
      </div>

      <div className="mb-8 space-y-5">
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Graduating class
          </p>
          <div className="flex justify-center">
            <GradePills />
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Class hour / semester section
          </p>
          <div className="flex justify-center">
            <ClassHourPills classes={hourClasses.length ? hourClasses : classes} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Tracking type
          </p>
          <div className="flex justify-center">
            <ParticipationPills />
          </div>
        </div>
        <GenderToggle />
        <p className="text-center text-sm text-muted">
          {gradesLabel(grades)} · {genderFullLabel(gender)} · {athletes.length} students
        </p>
      </div>

      <RosterTable athletes={athletes} showClass={!isAllGrades(grades) ? grades.length > 1 : true} />
      {athletes.length === 0 && (
        <p className="mt-4 max-w-xl text-sm text-muted">
          No students match these filters. Add a student above, or clear the hour / type filters.
        </p>
      )}
    </AppShell>
  );
}
