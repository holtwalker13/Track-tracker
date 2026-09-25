import { Card, CardTitle } from "@/components/ui/card";
import type { PeerLeaderRow } from "@/lib/queries/kpi";
import { DISPLAY_GROUP_LABELS, activityDisplayGroup } from "@/lib/activity-groups";

export function PeerLeadersCard({
  leaders,
  windowLabel,
}: {
  leaders: PeerLeaderRow[];
  windowLabel: string;
}) {
  const leading = leaders.filter((l) => l.isLeader);
  const ranked = leaders.filter((l) => l.rank != null).slice(0, 8);

  if (ranked.length === 0) {
    return (
      <Card className="mt-4">
        <CardTitle>Peer leaders · {windowLabel}</CardTitle>
        <p className="mt-3 text-sm text-muted">
          No marks in this window yet for your age group
          {windowLabel.toLowerCase().includes("week") ? " this week" : ""}.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardTitle>Peer leaders · {windowLabel}</CardTitle>
      <p className="mt-1 text-sm text-muted">
        {leading.length > 0
          ? `You’re #1 in ${leading.length} activit${leading.length === 1 ? "y" : "ies"} for this group.`
          : "Rank among classmates / age band for the selected window."}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {ranked.map((row) => (
          <li key={row.slug} className="flex items-center justify-between gap-3">
            <span>
              <span className="font-medium">{row.name}</span>
              <span className="ml-2 text-xs text-muted">
                {DISPLAY_GROUP_LABELS[activityDisplayGroup(row.slug, row.group)]}
              </span>
            </span>
            <span className={row.isLeader ? "font-bold text-sport-gold" : "tabular-nums text-muted"}>
              {row.isLeader
                ? windowLabel.toLowerCase().includes("week")
                  ? "Weekly #1"
                  : "#1"
                : `#${row.rank} of ${row.total}`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
