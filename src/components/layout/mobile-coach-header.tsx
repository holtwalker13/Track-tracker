"use client";

export function MobileCoachHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#30373B] bg-background px-4 py-2.5 md:hidden">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Pro Gradus</span>
      {title ? (
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{title}</p>
      ) : null}
    </header>
  );
}
