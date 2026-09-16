"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

export type CompareMode = "benchmark" | "peer" | "athlete";

function CompareModeInner({ allowAthlete }: { allowAthlete: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("vs");
  const mode: CompareMode =
    raw === "peer" || (allowAthlete && raw === "athlete") ? raw : "benchmark";

  const options: { id: CompareMode; label: string }[] = [
    { id: "benchmark", label: "Benchmark" },
    { id: "peer", label: "Grade avg" },
    ...(allowAthlete ? [{ id: "athlete" as const, label: "Athlete" }] : []),
  ];

  function select(next: CompareMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "benchmark") params.delete("vs");
    else params.set("vs", next);
    if (next !== "athlete") params.delete("b");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className={cn(
        "grid w-full max-w-lg rounded-lg bg-card p-1",
        allowAthlete ? "grid-cols-3" : "grid-cols-2"
      )}
      role="group"
      aria-label="Compare against"
    >
      {options.map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(opt.id)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold transition",
              active ? "bg-sky-500 text-white" : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CompareModeToggle({ allowAthlete = false }: { allowAthlete?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="h-11 max-w-lg rounded-lg bg-card" />
      }
    >
      <CompareModeInner allowAthlete={allowAthlete} />
    </Suspense>
  );
}
