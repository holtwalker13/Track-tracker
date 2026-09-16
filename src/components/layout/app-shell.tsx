import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Athletic Performance</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-card hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/api/auth/logout"
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
