import Link from "next/link";
import {
  Dumbbell,
  Footprints,
  MoreHorizontal,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import {
  groupLifts,
  LIFT_BODY_GROUPS,
  type LiftBodyGroup,
} from "@/lib/lift-groups";

const PREVIEW_PER_GROUP = 5;

const GROUP_ICONS: Record<LiftBodyGroup, LucideIcon> = {
  legs: Footprints,
  back: Rows3,
  arms: Dumbbell,
  other: MoreHorizontal,
};

export function ProgramsLiftPreview({ lifts }: { lifts: SchoolLiftRow[] }) {
  const grouped = groupLifts(lifts);
  const groupsWithLifts = LIFT_BODY_GROUPS.filter((g) => grouped[g.id].length > 0);

  return (
    <section className="rounded-2xl border border-card-border bg-card/30 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Lift library</h2>
          <p className="text-xs text-muted">
            {lifts.length} lifts · up to {PREVIEW_PER_GROUP} per group
          </p>
        </div>
        <Link
          href="/coach/programs/lifts"
          className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:border-accent/40 hover:text-accent"
        >
          See all lifts
        </Link>
      </div>

      {groupsWithLifts.length === 0 ? (
        <p className="text-sm text-muted">No lifts yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groupsWithLifts.map((group) => {
            const items = grouped[group.id].slice(0, PREVIEW_PER_GROUP);
            const extra = grouped[group.id].length - items.length;
            const GroupIcon = GROUP_ICONS[group.id];
            return (
              <div key={group.id} className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-sky-500/10 p-1 text-sky-300 ring-1 ring-sky-400/25">
                    <GroupIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {group.label}
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((lift) => (
                    <li
                      key={lift.slug}
                      className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/50 ring-1 ring-card-border">
                        <Dumbbell className="h-3.5 w-3.5 text-muted" aria-hidden />
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium">{lift.name}</span>
                    </li>
                  ))}
                </ul>
                {extra > 0 ? (
                  <Link
                    href="/coach/programs/lifts"
                    className="mt-1.5 inline-block px-1.5 text-xs text-accent hover:underline"
                  >
                    +{extra} more
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
