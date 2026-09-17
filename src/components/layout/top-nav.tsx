"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { isNavActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const linkClassName = cn(
  "flex shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-2",
  "min-w-[4.25rem] max-w-[5.75rem] text-muted transition hover:bg-card hover:text-foreground",
  "md:min-w-0 md:max-w-none md:px-3"
);

const labelClassName =
  "text-center text-[10px] font-medium leading-tight md:text-sm md:leading-snug";

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain pb-1",
        "-mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "md:mx-0 md:flex-wrap md:justify-end md:overflow-visible md:snap-none md:px-0 md:pb-0"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              linkClassName,
              active && "bg-card text-foreground ring-1 ring-card-border"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className={labelClassName}>{item.label}</span>
          </Link>
        );
      })}
      <Link href="/api/auth/logout" className={linkClassName}>
        <LogOut className="h-5 w-5 shrink-0" aria-hidden />
        <span className={labelClassName}>Sign out</span>
      </Link>
    </nav>
  );
}
