import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAthleteCompare } from "@/lib/queries/compare";
import { AthleteDuel } from "@/components/compare/athlete-duel";
import { CompareModeToggle, type CompareMode } from "@/components/compare/compare-mode-toggle";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { listStudents } from "@/lib/queries/coach";
import { PlayerAvatar } from "@/components/athletes/player-avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";

function qs(sp: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...sp, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    student?: string;
    b?: string;
    vs?: string;
    q?: string;
    grade?: string;
    grades?: string;
    gender?: string;
  }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const mode: CompareMode =
    sp.vs === "peer" || sp.vs === "athlete" ? sp.vs : "benchmark";

  const students = await listStudents(session.schoolId, {
    grades,
    search: sp.q,
    gender,
  });

  const selectedId = sp.student ?? students[0]?.id;
  const selected = students.find((s) => s.id === selectedId) ?? students[0];
  const opponentId =
    mode === "athlete"
      ? (sp.b && sp.b !== selected?.id ? sp.b : students.find((s) => s.id !== selected?.id)?.id)
      : undefined;

  const compare = selected
    ? await getAthleteCompare(selected.id, session.schoolId, opponentId)
    : null;

  const base = {
    q: sp.q,
    grades: sp.grades,
    gender: sp.gender,
    vs: sp.vs,
    student: selected?.id,
    b: opponentId,
  };

  const right =
    mode === "athlete" && compare?.opponent
      ? {
          name: compare.opponent.name,
          meta: `Grade ${compare.opponent.grade} · ${genderFullLabel(compare.opponent.gender)}`,
        }
      : mode === "peer"
        ? {
            name: compare?.peerLabel ?? "Grade avg",
            meta: "Same grade & gender",
            isBenchmark: true,
          }
        : {
            name: "Benchmark",
            meta: "National P50 · synthetic",
            isBenchmark: true,
          };

  return (
    <AppShell title="Compare" nav={COACH_NAV}>
      <p className="mb-4 text-sm text-muted">
        One athlete vs benchmark by default — or flip to grade average or another athlete.
      </p>

      <div className="mb-4 space-y-4">
        <GradePills />
        <GenderToggle />
        <CompareModeToggle allowAthlete />
      </div>

      <form className="mb-4">
        {sp.grades && <input type="hidden" name="grades" value={sp.grades} />}
        {sp.gender && <input type="hidden" name="gender" value={sp.gender} />}
        {sp.vs && <input type="hidden" name="vs" value={sp.vs} />}
        {sp.student && <input type="hidden" name="student" value={sp.student} />}
        <input
          name="q"
          placeholder="Search roster"
          defaultValue={sp.q}
          className="w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
        />
      </form>

      <p className="mb-2 text-xs uppercase tracking-wider text-muted">Athlete</p>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {students.slice(0, 20).map((s) => (
          <Link
            key={s.id}
            href={`/coach/compare${qs(base, { student: s.id })}`}
            className={cn(
              "flex min-w-[150px] items-center gap-2 rounded-xl border px-3 py-2",
              s.id === selected?.id
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-card-border bg-card hover:border-foreground/30"
            )}
          >
            <PlayerAvatar name={s.name} size="sm" />
            <span className="truncate text-sm font-medium">{s.name}</span>
          </Link>
        ))}
      </div>

      {mode === "athlete" && (
        <>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Opponent</p>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {students
              .filter((s) => s.id !== selected?.id)
              .slice(0, 20)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/coach/compare${qs(base, { vs: "athlete", b: s.id })}`}
                  className={cn(
                    "flex min-w-[150px] items-center gap-2 rounded-xl border px-3 py-2",
                    s.id === opponentId
                      ? "border-amber-400 bg-amber-400 text-background"
                      : "border-card-border bg-card hover:border-foreground/30"
                  )}
                >
                  <PlayerAvatar name={s.name} size="sm" />
                  <span className="truncate text-sm font-medium">{s.name}</span>
                </Link>
              ))}
          </div>
        </>
      )}

      {compare ? (
        <AthleteDuel
          left={{
            name: compare.student.name,
            meta: `Grade ${compare.student.grade} · ${genderFullLabel(compare.student.gender)}`,
          }}
          right={right}
          events={compare.events}
          rightSource={mode === "athlete" ? "athlete" : mode === "peer" ? "peer" : "benchmark"}
        />
      ) : (
        <Card>
          <p className="text-sm text-muted">No athletes in this filter.</p>
        </Card>
      )}
    </AppShell>
  );
}
