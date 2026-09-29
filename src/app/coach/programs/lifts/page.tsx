import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SchoolLiftsPanel } from "@/components/lifts/school-lifts-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { listSchoolLifts } from "@/lib/queries/lifts";

export default async function ProgramsLiftsPage() {
  const session = await requireSchoolSession();
  const schoolLifts = await listSchoolLifts(session.schoolId);

  return (
    <AppShell nav={COACH_NAV} title="Lift library">
      <p className="mb-4 text-sm">
        <Link href="/coach/programs" className="text-accent hover:underline">
          ← Programs
        </Link>
      </p>
      <SchoolLiftsPanel lifts={schoolLifts} />
    </AppShell>
  );
}
