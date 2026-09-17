import Link from "next/link";
import { ROSTER_COLUMNS, type RosterAthlete } from "@/lib/queries/roster";
import { classYearShort } from "@/lib/grades";

export function RosterTable({
  athletes,
  showClass,
}: {
  athletes: RosterAthlete[];
  showClass: boolean;
}) {
  if (athletes.length === 0) {
    return <p className="text-sm text-muted">No athletes in this filter.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-card text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="sticky left-0 z-10 bg-card px-3 py-2.5 font-semibold">Name</th>
            {showClass && <th className="px-3 py-2.5 font-semibold">Class</th>}
            <th className="px-3 py-2.5 font-semibold">Sports</th>
            {ROSTER_COLUMNS.map((col) => (
              <th key={col.slug} className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {athletes.map((a) => (
            <tr key={a.studentId} className="border-t border-card-border/70 hover:bg-white/[0.03]">
              <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium whitespace-nowrap">
                <Link href={`/coach/students/${a.studentId}`} className="hover:text-accent">
                  {a.fullName}
                </Link>
              </td>
              {showClass && (
                <td className="px-3 py-2 tabular-nums text-muted">
                  {a.classYear != null ? classYearShort(a.classYear) : "—"}
                </td>
              )}
              <td className="max-w-[10rem] truncate px-3 py-2 text-muted" title={a.sports ?? undefined}>
                {a.sports ?? "—"}
              </td>
              {ROSTER_COLUMNS.map((col) => (
                <td key={col.slug} className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                  {a.marks[col.slug]?.display ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-card-border px-3 py-2 text-xs text-muted">
        {athletes.length} athlete{athletes.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
