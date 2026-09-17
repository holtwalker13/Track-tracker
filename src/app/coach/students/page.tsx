import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { classYearLabel, singleGradeFromSearch } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { getGradeBoxScores } from "@/lib/queries/box-score";
import { BoxScoreBoard } from "@/components/stats/box-score";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string; q?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grade = singleGradeFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const boxScores = await getGradeBoxScores(session.schoolId, [grade], gender);

  const filtered = sp.q
    ? boxScores.map((g) => ({
        ...g,
        groups: g.groups
          .map((group) => ({
            ...group,
            rows: group.rows.filter((r) =>
              r.fullName.toLowerCase().includes(sp.q!.toLowerCase())
            ),
          }))
          .filter((group) => group.rows.length > 0),
      }))
    : boxScores;

  return (
    <AppShell title="Roster" nav={COACH_NAV}>
      <form className="mb-6 flex justify-center">
        <input type="hidden" name="grade" value={String(grade)} />
        {sp.gender && <input type="hidden" name="gender" value={sp.gender} />}
        <input
          name="q"
          placeholder="Search name"
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
            <GradePills mode="single" />
          </div>
        </div>
        <GenderToggle />
        <p className="text-center text-sm text-muted">
          {classYearLabel(grade)} · {genderFullLabel(gender)}
        </p>
      </div>

      <BoxScoreBoard
        grades={filtered}
        gender={gender}
        hrefForStudent={(id) => `/coach/students/${id}`}
      />
    </AppShell>
  );
}
