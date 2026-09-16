"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { GRADE_LEVELS, parseGradesParam } from "@/lib/grades";

type Pill = { id: string; label: string };

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-foreground text-background"
          : "border border-card-border text-muted hover:border-foreground/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function GradePillsInner({
  param = "grades",
  mode = "multi",
}: {
  param?: string;
  mode?: "multi" | "single";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected =
    mode === "single"
      ? (() => {
          const raw = searchParams.get("grade") ?? searchParams.get(param);
          if (!raw) return [7];
          const n = parseInt(raw.split(",")[0]!, 10);
          return (GRADE_LEVELS as readonly number[]).includes(n) ? [n] : [7];
        })()
      : parseGradesParam(searchParams.get(param));
  const allOn = mode === "multi" && selected.length === GRADE_LEVELS.length;

  function pushMulti(next: number[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("grade");
    if (next.length === 0 || next.length === GRADE_LEVELS.length) {
      params.delete(param);
    } else {
      params.set(param, [...next].sort((a, b) => a - b).join(","));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function pushSingle(grade: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    params.set("grade", String(grade));
    const qs = params.toString();
    router.push(`${pathname}?${qs}`);
  }

  function onAll() {
    pushMulti([...GRADE_LEVELS]);
  }

  function onGrade(grade: number) {
    if (mode === "single") {
      pushSingle(grade);
      return;
    }
    if (allOn) {
      pushMulti([grade]);
      return;
    }
    const has = selected.includes(grade);
    const next = has ? selected.filter((g) => g !== grade) : [...selected, grade];
    pushMulti(next.length === 0 ? [...GRADE_LEVELS] : next);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by grade">
      {mode === "multi" && (
        <PillButton active={allOn} onClick={onAll}>
          All
        </PillButton>
      )}
      {GRADE_LEVELS.map((g) => (
        <PillButton key={g} active={selected.includes(g)} onClick={() => onGrade(g)}>
          {mode === "single" ? `G${g}` : g}
        </PillButton>
      ))}
    </div>
  );
}

export function GradePills(props: { param?: string; mode?: "multi" | "single" }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap gap-2">
          {(props.mode === "single"
            ? GRADE_LEVELS.map((g) => `G${g}`)
            : ["All", ...GRADE_LEVELS.map(String)]
          ).map((label) => (
            <span
              key={label}
              className="rounded-full border border-card-border px-3 py-1.5 text-sm font-medium text-muted"
            >
              {label}
            </span>
          ))}
        </div>
      }
    >
      <GradePillsInner {...props} />
    </Suspense>
  );
}

export function FilterPills({
  pills,
  activeId,
  onSelect,
}: {
  pills: Pill[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p) => (
        <PillButton key={p.id} active={p.id === activeId} onClick={() => onSelect(p.id)}>
          {p.label}
        </PillButton>
      ))}
    </div>
  );
}
