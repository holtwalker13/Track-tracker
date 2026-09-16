import type { SchoolYearAttemptLog } from "@/lib/queries/attempt-log";
import { Card, CardTitle } from "@/components/ui/card";

export function AttemptSchedule({ years }: { years: SchoolYearAttemptLog[] }) {
  if (years.length === 0) {
    return (
      <Card>
        <CardTitle>Attempt log</CardTitle>
        <p className="mt-3 text-sm text-muted">No attempts recorded yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <Card key={year.schoolYearId} className="overflow-hidden p-0">
          <div className="border-b border-card-border px-5 py-4">
            <CardTitle className="!text-base">
              {year.label}
              {year.isCurrent && (
                <span className="ml-2 rounded bg-accent/20 px-2 py-0.5 text-xs font-normal text-accent">
                  Current year
                </span>
              )}
            </CardTitle>
            {year.gradeLevel != null && (
              <p className="mt-1 text-sm text-muted">Grade {year.gradeLevel}</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-background/40 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Best</th>
                  <th className="px-4 py-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {year.events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-muted">
                      No attempts this year
                    </td>
                  </tr>
                ) : (
                  year.events.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-t border-card-border/50 hover:bg-card-border/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {ev.testingDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {ev.activityName}
                        {ev.isPersonalRecord && (
                          <span className="ml-2 text-xs text-success">PR</span>
                        )}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-muted">
                        {ev.sessionName ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {ev.attempts.length > 0
                          ? ev.attempts.map((a) => a.toFixed(1)).join(" · ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-accent">{ev.bestDisplay}</td>
                      <td className="px-4 py-3 text-sm">
                        {ev.deltaDisplay ? (
                          <span
                            className={
                              ev.deltaFromPrevious != null && ev.deltaFromPrevious > 0
                                ? "text-success"
                                : "text-muted"
                            }
                          >
                            {ev.deltaDisplay}
                          </span>
                        ) : (
                          <span className="text-muted">First attempt</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
