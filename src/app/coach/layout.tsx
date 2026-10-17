import { CoachMobileUiProvider } from "@/components/layout/coach-mobile-ui-provider";
import { CoachScopeDirtyProvider } from "@/components/coach-scope/coach-scope-dirty-context";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let schoolName: string | null = null;
  if (session?.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true },
    });
    schoolName = school?.name ?? null;
  }

  return (
    <CoachScopeDirtyProvider>
      <CoachMobileUiProvider
        schoolName={schoolName}
        isAdmin={session?.role === "ADMIN"}
      >
        {children}
      </CoachMobileUiProvider>
    </CoachScopeDirtyProvider>
  );
}
