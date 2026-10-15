"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

function PickerInner({
  options,
  classId,
  date,
}: {
  options: { id: string; name: string; period: string | null }[];
  classId: string;
  date: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const dateRef = useRef<HTMLInputElement>(null);

  function pick(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("classId", next);
    else params.delete("classId");
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  function applyDate(next?: string) {
    const value = (next ?? dateRef.current?.value ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    const href = `${pathname}?${params.toString()}`;
    startTransition(() => {
      router.push(href);
      router.refresh();
    });
  }

  return (
    <div className={`mb-4 flex flex-wrap gap-4 text-sm ${pending ? "opacity-70" : ""}`}>
      <label className="block min-w-[12rem] flex-1">
        <span className="font-semibold uppercase tracking-wide text-muted">Workout date</span>
        <span className="mt-1 flex max-w-md gap-2">
          <input
            key={date}
            ref={dateRef}
            type="date"
            defaultValue={date}
            onChange={(e) => applyDate(e.target.value)}
            className="block w-full rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
          />
          <button
            type="button"
            onClick={() => applyDate()}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background"
          >
            Apply
          </button>
        </span>
      </label>
      {options.length > 0 ? (
        <label className="block min-w-[12rem] flex-1">
          <span className="font-semibold uppercase tracking-wide text-muted">Class assignment</span>
          <select
            value={classId}
            onChange={(e) => pick(e.target.value)}
            className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function StudentWorkoutClassPicker(props: {
  options: { id: string; name: string; period: string | null }[];
  classId: string;
  date: string;
}) {
  return (
    <Suspense fallback={null}>
      <PickerInner {...props} />
    </Suspense>
  );
}
