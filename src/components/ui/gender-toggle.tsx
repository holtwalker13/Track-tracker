"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { parseGenderParam } from "@/lib/gender";

function GenderToggleInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gender = parseGenderParam(searchParams.get("gender"));

  function select(next: "M" | "F") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "M") params.delete("gender");
    else params.set("gender", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className="grid w-full max-w-sm grid-cols-2 rounded-lg bg-card p-1"
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
              "rounded-md px-4 py-2 text-sm font-semibold transition",
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

export function GenderToggle() {
  return (
    <Suspense
      fallback={
        <div className="grid w-full max-w-sm grid-cols-2 rounded-lg bg-card p-1">
          <span className="rounded-md bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white">
            Boys
          </span>
          <span className="px-4 py-2 text-center text-sm font-semibold text-muted">Girls</span>
        </div>
      }
    >
      <GenderToggleInner />
    </Suspense>
  );
}
