import { AppShell } from "@/components/layout/app-shell";
import { CompeteUiProvider } from "@/components/compete/compete-ui-provider";
import { COACH_NAV } from "@/lib/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function CompeteHubLayout({ children }: { children: React.ReactNode }) {
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
    <AppShell title="Compete" nav={COACH_NAV} navCompact competeMobileChrome>
      <CompeteUiProvider
        schoolName={schoolName}
        isAdmin={session?.role === "ADMIN"}
      >
        {children}
      </CompeteUiProvider>
    </AppShell>
  );
}
