import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GradeBoxScore } from "@/lib/queries/box-score";
import { genderFullLabel, type AthleteGender } from "@/lib/gender";

export function BoxScoreBoard({
  grades,
  gender,
  hrefForStudent,
}: {
  grades: GradeBoxScore[];
  gender: AthleteGender;
  hrefForStudent?: (studentId: string) => string;
}) {
  const side = genderFullLabel(gender);

  if (grades.length === 0) {
    return <p className="text-sm text-muted">No athletes in this filter.</p>;
  }

  return (
    <div className="space-y-10">
      {grades.map((grade) => (
        <section key={grade.grade}>
          <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-[0.2em]">
            Grade {grade.grade}
            <span className="mx-2 text-muted">·</span>
            {side}
          </h2>
          {grade.groups.length === 0 ? (
            <p className="text-sm text-muted">No scores yet for this group.</p>
          ) : (
            <div className="space-y-8">
              {grade.groups.map((group) => (
                <div key={group.group}>
                  <div className="mb-1 flex items-end gap-3">
                    <h3 className="w-28 shrink-0 text-lg font-bold sm:w-36">{group.label}</h3>
                    <div
                      className="hidden min-w-0 flex-1 gap-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid"
                      style={{
                        gridTemplateColumns: `repeat(${group.activities.length}, minmax(3rem, 1fr))`,
                      }}
                    >
                      {group.activities.map((act) => (
                        <span key={act.slug} title={act.name}>
                          {act.abbr}
                        </span>
                      ))}
                    </div>
                    {hrefForStudent && <span className="hidden w-4 sm:block" />}
                  </div>
                  <ul>
                    {group.rows.map((row) => {
                      const inner = (
                        <div className="flex items-center gap-3 border-b border-card-border/60 py-2.5">
                          <span className="w-28 shrink-0 truncate font-medium sm:w-36">
                            {row.name}
                          </span>
                          <div
                            className="grid min-w-0 flex-1 gap-2 text-right font-mono text-sm tabular-nums"
                            style={{
                              gridTemplateColumns: `repeat(${group.activities.length}, minmax(3rem, 1fr))`,
                            }}
                          >
                            {group.activities.map((act) => (
                              <span key={act.slug} className="text-muted sm:text-foreground">
                                <span className="mr-1 text-[10px] uppercase text-muted sm:hidden">
                                  {act.abbr}
                                </span>
                                {row.marks[act.slug]?.display ?? "—"}
                              </span>
                            ))}
                          </div>
                          {hrefForStudent && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                          )}
                        </div>
                      );
                      return (
                        <li key={row.studentId}>
                          {hrefForStudent ? (
                            <Link
                              href={hrefForStudent(row.studentId)}
                              className="block hover:bg-card/60"
                              title={row.fullName}
                            >
                              {inner}
                            </Link>
                          ) : (
                            inner
                          )}
                        </li>
                      );
                    })}
                    <li className="flex items-center gap-3 py-2.5">
                      <span className="w-28 shrink-0 font-bold sm:w-36">Total</span>
                      <div
                        className="grid min-w-0 flex-1 gap-2 text-right font-mono text-sm font-bold tabular-nums"
                        style={{
                          gridTemplateColumns: `repeat(${group.activities.length}, minmax(3rem, 1fr))`,
                        }}
                      >
                        {group.activities.map((act) => (
                          <span key={act.slug}>{group.totals[act.slug]?.display ?? "—"}</span>
                        ))}
                      </div>
                      {hrefForStudent && <span className="w-4" />}
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
