import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch, gradesLabel, isAllGrades } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { getClassRoster } from "@/lib/queries/roster";
import { RosterTable } from "@/components/athletes/roster-table";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string; q?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const roster = await getClassRoster(session.schoolId, grades, gender);

  const q = sp.q?.trim().toLowerCase();
  const athletes = q
    ? roster.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          (a.sports ?? "").toLowerCase().includes(q)
      )
    : roster;

  return (
    <AppShell title="Roster" nav={COACH_NAV}>
      <form className="mb-6 flex justify-center">
        {sp.gender && <input type="hidden" name="gender" value={sp.gender} />}
        {sp.grades && <input type="hidden" name="grades" value={sp.grades} />}
        {sp.grade && <input type="hidden" name="grade" value={sp.grade} />}
        <input
          name="q"
          placeholder="Search name or sport"
          defaultValue={sp.q}
          className="w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
        />
      </form>

      <div className="mb-8 space-y-5">
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Class
          </p>
          <div className="flex justify-center">
            <GradePills />
          </div>
        </div>
        <GenderToggle />
        <p className="text-center text-sm text-muted">
          {gradesLabel(grades)} · {genderFullLabel(gender)} · {athletes.length} athletes
        </p>
      </div>

      <RosterTable athletes={athletes} showClass={!isAllGrades(grades) ? grades.length > 1 : true} />
      {athletes.length === 0 && (
        <p className="mt-4 max-w-xl text-sm text-muted">
          The roster is empty in the database this app is connected to. Git does not
          include database files. If you expected JHS athletes, stop any{" "}
          <code>npm run dev</code> on port 3000 and start Docker (Postgres + app) so it can seed:
          <br />
          <code className="mt-2 block rounded-md bg-card px-3 py-2 text-foreground">
            docker compose up --build
          </code>
        </p>
      )}
    </AppShell>
  );
}
