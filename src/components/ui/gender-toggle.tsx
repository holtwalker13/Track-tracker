"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { parseGenderParam } from "@/lib/gender";

function GenderToggleInner({
  className,
  variant = "panel",
  lockedGender,
}: {
  className?: string;
  variant?: "panel" | "inline";
  /** When set, display only this gender (student leaderboards). */
  lockedGender?: "M" | "F";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gender = lockedGender ?? parseGenderParam(searchParams.get("gender"));

  function select(next: "M" | "F") {
    if (lockedGender) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "F") params.delete("gender");
    else params.set("gender", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const options = [
    { id: "M" as const, label: variant === "inline" ? "Boys" : "Boys" },
    { id: "F" as const, label: variant === "inline" ? "Girls" : "Girls" },
  ];

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-grid shrink-0 grid-cols-2 rounded-full bg-[#1a1f28] p-0.5 ring-1 ring-card-border",
          className
        )}
        role="group"
        aria-label={lockedGender ? "Your gender group" : "Boys or girls"}
      >
        {options.map((opt) => {
          const active = gender === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={Boolean(lockedGender)}
              aria-pressed={active}
              onClick={() => select(opt.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                lockedGender && "cursor-default",
                active
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                  : "text-muted hover:text-foreground",
                lockedGender && !active && "opacity-40 hover:text-muted"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-xs grid-cols-2 rounded-full bg-[#1a1f28] p-1 ring-1 ring-card-border",
        className
      )}
      role="group"
      aria-label="Boys or girls"
    >
      {options.map((opt) => {
        const active = gender === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(opt.id)}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-bold tracking-wide transition",
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

function GenderToggleFallback({
  className,
  variant = "panel",
}: {
  className?: string;
  variant?: "panel" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-grid grid-cols-2 rounded-full bg-[#1a1f28] p-0.5 ring-1 ring-card-border",
          className
        )}
      >
        <span className="rounded-full bg-sky-500 px-3 py-1.5 text-center text-xs font-semibold text-white">
          Boys
        </span>
        <span className="rounded-full px-3 py-1.5 text-center text-xs font-semibold text-muted">
          Girls
        </span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-xs grid-cols-2 rounded-full bg-[#1a1f28] p-1 ring-1 ring-card-border",
        className
      )}
    >
      <span className="rounded-full px-4 py-2.5 text-center text-sm font-bold text-muted">Boys</span>
      <span className="rounded-full bg-sky-500 px-4 py-2.5 text-center text-sm font-bold text-white">
        Girls
      </span>
    </div>
  );
}

export function GenderToggle({
  className,
  variant = "panel",
  lockedGender,
}: {
  className?: string;
  variant?: "panel" | "inline";
  lockedGender?: "M" | "F";
}) {
  return (
    <Suspense fallback={<GenderToggleFallback className={className} variant={variant} />}>
      <GenderToggleInner className={className} variant={variant} lockedGender={lockedGender} />
    </Suspense>
  );
}
