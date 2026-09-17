import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GradeBoxScore } from "@/lib/queries/box-score";
import { genderFullLabel, type AthleteGender } from "@/lib/gender";
import { classYearLabel } from "@/lib/grades";

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
    <div className="space-y-12">
      {grades.map((grade) => (
        <section key={grade.grade}>
          {grades.length > 0 && (
            <h2 className="mb-6 text-center text-xs font-bold uppercase tracking-[0.25em] text-muted">
              {classYearLabel(grade.grade)}
              <span className="mx-2 text-card-border">·</span>
              {side}
            </h2>
          )}
          {grade.groups.length === 0 ? (
            <p className="text-center text-sm text-muted">No scores yet for this group.</p>
          ) : (
            <div className="space-y-10">
              {grade.groups.map((group) => (
                <div key={group.group}>
                  <div className="mb-1 flex items-end gap-3 border-b border-transparent pb-1">
                    <h3 className="w-32 shrink-0 text-xl font-bold tracking-tight sm:w-40">
                      {group.label}
                    </h3>
                    <div
                      className="hidden min-w-0 flex-1 gap-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted sm:grid"
                      style={{
                        gridTemplateColumns: `repeat(${group.activities.length}, minmax(3.25rem, 1fr))`,
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
                      const cells = (
                        <>
                          <span className="w-32 shrink-0 truncate font-medium sm:w-40">
                            {row.fullName}
                            <span className="mt-0.5 block text-[11px] font-normal text-muted">
                              {classYearLabel(grade.grade)}
                            </span>
                          </span>
                          <div
                            className="grid min-w-0 flex-1 gap-2 text-right font-mono text-sm tabular-nums"
                            style={{
                              gridTemplateColumns: `repeat(${group.activities.length}, minmax(3.25rem, 1fr))`,
                            }}
                          >
                            {group.activities.map((act) => (
                              <span key={act.slug}>
                                <span className="mr-1 text-[10px] font-sans uppercase text-muted sm:hidden">
                                  {act.abbr}
                                </span>
                                {row.marks[act.slug]?.display ?? "—"}
                              </span>
                            ))}
                          </div>
                          {hrefForStudent && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                          )}
                        </>
                      );

                      return (
                        <li key={row.studentId}>
                          {hrefForStudent ? (
                            <Link
                              href={hrefForStudent(row.studentId)}
                              className="flex items-center gap-3 border-b border-card-border/50 py-2.5 hover:bg-white/[0.03]"
                              title={row.fullName}
                            >
                              {cells}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 border-b border-card-border/50 py-2.5">
                              {cells}
                            </div>
                          )}
                        </li>
                      );
                    })}
                    <li className="flex items-center gap-3 border-t border-card-border pt-3">
                      <span className="w-32 shrink-0 font-bold sm:w-40">Avg</span>
                      <div
                        className="grid min-w-0 flex-1 gap-2 text-right font-mono text-sm font-bold tabular-nums"
                        style={{
                          gridTemplateColumns: `repeat(${group.activities.length}, minmax(3.25rem, 1fr))`,
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
