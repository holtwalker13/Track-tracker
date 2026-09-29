"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ClassSubgroupFilter({
  subgroups,
  paramName = "subgroupId",
  classId,
}: {
  subgroups: { id: string; name: string; memberIds: string[] }[];
  paramName?: string;
  classId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";

  if (!classId || subgroups.length === 0) return null;

  function pick(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set(paramName, id);
    else params.delete(paramName);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="block text-sm">
      Subgroup
      <select
        value={current}
        onChange={(e) => pick(e.target.value)}
        className="mt-1 block min-w-[12rem] rounded-lg border border-card-border bg-background px-3 py-2"
      >
        <option value="">All athletes in class</option>
        {subgroups.map((sg) => (
          <option key={sg.id} value={sg.id}>
            {sg.name} ({sg.memberIds.length})
          </option>
        ))}
      </select>
    </label>
  );
}
