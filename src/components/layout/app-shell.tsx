import { Podium } from "lucide-react";
import { TopNav } from "@/components/layout/top-nav";
import { SchoolSwitcher } from "@/components/admin/school-switcher";
import type { NavItem } from "@/lib/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export async function AppShell({
  title,
  nav,
  children,
  density = "default",
  navCompact = false,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
  /** Tighter page chrome for focused workflows (live testing). */
  density?: "default" | "compact";
  /** Smaller icon-first nav on mobile. */
  navCompact?: boolean;
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

  const compact = density === "compact";

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur",
          compact && "border-card-border/70"
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl",
            compact ? "px-3 py-1.5 sm:px-4 sm:py-2" : "px-3 py-2 sm:px-4 sm:py-2.5"
          )}
        >
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Podium
                className={cn(
                  "shrink-0 text-accent",
                  compact ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7"
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <h1
                  className={cn(
                    "truncate font-bold uppercase tracking-wide",
                    compact ? "text-sm sm:text-base" : "text-base sm:text-lg"
                  )}
                >
                  {title}
                </h1>
                {schoolName ? (
                  <p
                    className={cn(
                      "truncate font-semibold uppercase tracking-[0.16em] text-accent",
                      compact ? "text-[9px] leading-tight" : "text-[10px] leading-tight"
                    )}
                  >
                    {schoolName}
                  </p>
                ) : null}
              </div>
              {session?.role === "ADMIN" && schools.length > 0 ? (
                <div className="hidden shrink-0 sm:block">
                  <SchoolSwitcher schools={schools} currentSchoolId={session.schoolId} />
                </div>
              ) : null}
            </div>
            <TopNav items={items} compact={navCompact || compact} />
          </div>
          {session?.role === "ADMIN" && schools.length > 0 ? (
            <div className="mt-2 sm:hidden">
              <SchoolSwitcher schools={schools} currentSchoolId={session.schoolId} />
            </div>
          ) : null}
        </div>
      </header>
      <main
        className={cn(
          "mx-auto max-w-7xl",
          compact ? "px-3 py-3 sm:px-4 sm:py-4" : "px-3 py-4 sm:px-4 sm:py-6"
        )}
      >
        {children}
      </main>
    </div>
  );
}
