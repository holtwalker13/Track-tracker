import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch } from "@/lib/grades";
import { parseGenderParam } from "@/lib/gender";
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
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const boxScores = await getGradeBoxScores(session.schoolId, grades, gender);

  const filtered = sp.q
    ? boxScores.map((g) => ({
        ...g,
        groups: g.groups.map((group) => ({
          ...group,
          rows: group.rows.filter((r) =>
            r.fullName.toLowerCase().includes(sp.q!.toLowerCase())
          ),
        })).filter((group) => group.rows.length > 0),
      }))
    : boxScores;

  return (
    <AppShell title="Roster" nav={COACH_NAV}>
      <form className="mb-4">
        {sp.grades && <input type="hidden" name="grades" value={sp.grades} />}
        {sp.gender && <input type="hidden" name="gender" value={sp.gender} />}
        <input
          name="q"
          placeholder="Search name"
          defaultValue={sp.q}
          className="w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
        />
      </form>
      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
      </div>
      <BoxScoreBoard
        grades={filtered}
        gender={gender}
        hrefForStudent={(id) => `/coach/students/${id}`}
      />
    </AppShell>
  );
}
