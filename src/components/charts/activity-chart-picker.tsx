"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ActivityChartPicker({
  activities,
  selected,
}: {
  activities: { slug: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="mb-4 block text-sm text-muted">
      Event
      <select
        className="mt-1 w-full max-w-sm rounded-lg border border-card-border bg-card px-3 py-2 text-foreground"
        value={selected}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("activity", e.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {activities.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
