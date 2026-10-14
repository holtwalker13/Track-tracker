"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
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

  function pick(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("classId", next);
    else params.delete("classId");
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  function pickDate(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("date", next);
    else params.delete("date");
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className={`mb-4 flex flex-wrap gap-4 text-sm ${pending ? "opacity-70" : ""}`}>
      <label className="block min-w-[12rem] flex-1">
        <span className="font-semibold uppercase tracking-wide text-muted">Workout date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => pickDate(e.target.value)}
          className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
        />
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
