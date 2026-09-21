"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

function RankScopeToggleInner({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "global" ? "global" : "school";

  function select(next: "school" | "global") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "school") params.delete("scope");
    else params.set("scope", "global");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className={cn("mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-[#1a1f28] p-1", className)}
      role="group"
      aria-label="School or global rank"
    >
      {(
        [
          { id: "school", label: "School rank" },
          { id: "global", label: "Global rank" },
        ] as const
      ).map((opt) => {
        const active = scope === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(opt.id)}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-bold tracking-wide transition",
              active
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RankScopeToggle({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <div className={cn("mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-[#1a1f28] p-1", className)}>
          <span className="rounded-lg bg-sky-500 px-4 py-2.5 text-center text-sm font-bold text-white">
            School rank
          </span>
          <span className="px-4 py-2.5 text-center text-sm font-bold text-muted">Global rank</span>
        </div>
      }
    >
      <RankScopeToggleInner className={className} />
    </Suspense>
  );
}
