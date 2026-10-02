"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

function PickerInner({
  options,
  classId,
}: {
  options: { id: string; name: string; period: string | null }[];
  classId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  if (options.length <= 1) return null;

  function pick(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("classId", next);
    else params.delete("classId");
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <label className={`mb-4 block text-sm ${pending ? "opacity-70" : ""}`}>
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
  );
}

export function StudentWorkoutClassPicker(props: {
  options: { id: string; name: string; period: string | null }[];
  classId: string;
}) {
  return (
    <Suspense fallback={null}>
      <PickerInner {...props} />
    </Suspense>
  );
}
