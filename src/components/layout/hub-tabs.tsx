"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type HubTab = { href: string; label: string };

export function HubTabs({ tabs }: { tabs: HubTab[] }) {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label="Section"
      className="mb-5 flex flex-wrap gap-1 rounded-xl border border-card-border bg-card/40 p-1"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-accent/15 text-accent ring-1 ring-accent/40"
                : "text-muted hover:bg-background/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
