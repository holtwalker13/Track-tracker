import { TopNav } from "@/components/layout/top-nav";
import type { NavItem } from "@/lib/navigation";

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Track Tracker
              </p>
              <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            </div>
            <TopNav items={nav} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
