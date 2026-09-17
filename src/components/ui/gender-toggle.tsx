"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { parseGenderParam } from "@/lib/gender";

function GenderToggleInner({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gender = parseGenderParam(searchParams.get("gender"));

  function select(next: "M" | "F") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "F") params.delete("gender");
    else params.set("gender", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className={cn("mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-[#1a1f28] p-1", className)}
      role="group"
      aria-label="Boys or girls"
    >
      {([
        { id: "M", label: "Boys" },
        { id: "F", label: "Girls" },
      ] as const).map((opt) => {
        const active = gender === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(opt.id)}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-bold tracking-wide transition",
              active ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function GenderToggle({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <div className={cn("mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-[#1a1f28] p-1", className)}>
          <span className="px-4 py-2.5 text-center text-sm font-bold text-muted">Boys</span>
          <span className="rounded-lg bg-sky-500 px-4 py-2.5 text-center text-sm font-bold text-white">
            Girls
          </span>
        </div>
      }
    >
      <GenderToggleInner className={className} />
    </Suspense>
  );
}
