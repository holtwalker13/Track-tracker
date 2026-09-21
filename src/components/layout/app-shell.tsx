import { TopNav } from "@/components/layout/top-nav";
import { SchoolSwitcher } from "@/components/admin/school-switcher";
import type { NavItem } from "@/lib/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const session = await getSession();
  let schoolName: string | null = null;
  let schools: { id: string; name: string }[] = [];

  if (session?.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true },
    });
    schoolName = school?.name ?? null;
  }
  if (session?.role === "ADMIN") {
    schools = await prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
  }

  const items =
    session?.role === "ADMIN" && !nav.some((i) => i.href === "/admin")
      ? [{ href: "/admin", label: "Schools", icon: "classes" as const }, ...nav]
      : nav;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3 md:block">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Track Tracker
                  {schoolName ? <span className="text-accent"> · {schoolName}</span> : null}
                </p>
                <h1 className="text-lg font-bold uppercase tracking-wide">{title}</h1>
              </div>
              {session?.role === "ADMIN" && schools.length > 0 ? (
                <div className="md:mt-2">
                  <SchoolSwitcher schools={schools} currentSchoolId={session.schoolId} />
                </div>
              ) : null}
            </div>
            <TopNav items={items} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
