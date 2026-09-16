import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { listStudents } from "@/lib/queries/coach";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; q?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grade = sp.grade ? parseInt(sp.grade, 10) : undefined;
  const students = await listStudents(session.schoolId, {
    grade,
    search: sp.q,
  });

  return (
    <AppShell title="Student Directory" nav={COACH_NAV}>
      <form className="mb-6 flex flex-wrap gap-3">
        <input
          name="q"
          placeholder="Search name or student ID"
          defaultValue={sp.q}
          className="rounded-lg border border-card-border bg-background px-3 py-2"
        />
        <select
          name="grade"
          defaultValue={sp.grade ?? ""}
          className="rounded-lg border border-card-border bg-background px-3 py-2"
        >
          <option value="">All grades</option>
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-medium text-background">
          Filter
        </button>
      </form>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-card-border text-left text-muted">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Grade</th>
              <th className="p-4">ID</th>
              <th className="p-4">Latest test</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-card-border/50 hover:bg-card-border/20">
                <td className="p-4">
                  <Link href={`/coach/students/${s.id}`} className="font-medium hover:text-accent">
                    {s.name}
                  </Link>
                </td>
                <td className="p-4">{s.grade ?? "—"}</td>
                <td className="p-4 font-mono text-muted">{s.studentNumber}</td>
                <td className="p-4 text-muted">
                  {s.latestTest ? new Date(s.latestTest).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
