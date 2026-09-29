import { CoachStaffPanel } from "@/components/admin/coach-staff-panel";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function SchoolCoachesPage() {
  const session = await requireSchoolSession();
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { slug: true, name: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Coaches</h2>
        <p className="mt-1 text-sm text-muted">
          Staff for {school?.name ?? "this school"}.{" "}
          {session.role === "ADMIN"
            ? "Add coaches and send setup links so they can create a password."
            : "Your school’s coaching staff and the classes they lead."}
        </p>
      </div>
      <CoachStaffPanel
        schoolSlug={school?.slug ?? null}
        canManage={session.role === "ADMIN"}
      />
    </div>
  );
}
