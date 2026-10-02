"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

export function AthleteProfileClassPicker({
  classes,
  selectedClassId,
}: {
  classes: { id: string; name: string; period: string | null }[];
  selectedClassId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  if (classes.length === 0) return null;

  function pick(classId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) params.set("classId", classId);
    else params.delete("classId");
    void fetch("/api/coach/class-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: classId || null, subgroupId: null }),
    });
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <label className={`mb-4 block text-sm ${pending ? "opacity-70" : ""}`}>
      <span className="font-semibold uppercase tracking-wide text-muted">Medal class</span>
      <select
        value={selectedClassId ?? ""}
        onChange={(e) => pick(e.target.value)}
        className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {classSectionLabel(c)}
          </option>
        ))}
      </select>
    </label>
  );
}
