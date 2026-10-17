"use client";

import Link from "next/link";
import { BottomSheet } from "@/components/compete/bottom-sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { COACH_NAV } from "@/lib/navigation";

export function MoreMenuSheet({
  open,
  onClose,
  schoolName,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  schoolName: string | null;
  isAdmin: boolean;
}) {
  return (
    <BottomSheet open={open} title="Navigation" onClose={onClose}>
      {schoolName ? (
        <p className="mb-3 text-xs text-muted">{schoolName}</p>
      ) : null}
      <div className="divide-y divide-[#30373B]">
        {COACH_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block py-3 text-sm font-medium text-foreground"
          >
            {item.label}
          </Link>
        ))}
        {isAdmin ? (
          <Link
            href="/admin"
            onClick={onClose}
            className="block py-3 text-sm font-medium text-foreground"
          >
            Admin
          </Link>
        ) : null}
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-medium">Appearance</span>
          <ThemeToggle />
        </div>
        <form action="/api/auth/logout" method="POST" className="py-3">
          <button type="submit" className="text-sm font-medium text-foreground">
            Account & sign out
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
