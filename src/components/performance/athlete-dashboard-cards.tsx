import { Card, CardTitle } from "@/components/ui/card";
import { AccoladeIcon } from "@/components/gamification/accolade-icon";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import { themeForAccoladeCategory } from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";
import type { getStudentScorecard } from "@/lib/queries/student";

type ScorecardRow = Awaited<ReturnType<typeof getStudentScorecard>>[number];

export function PeriodLeadersCard({
  items,
}: {
  items: {
    slug: string;
    name: string;
    category: string;
    periodType: string;
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <Card className="mt-6 border-sport-gold/30 bg-sport-gold/5">
      <CardTitle className="text-sport-gold">Period leaders</CardTitle>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((d) => {
          const cat = d.category as AccoladeCategory;
          const theme = themeForAccoladeCategory(cat);
          return (
            <li key={d.slug} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <AccoladeIcon slug={d.slug} category={cat} earned size="sm" />
                <span className={cn("font-semibold", theme.sectionAccent)}>{d.name}</span>
              </span>
              <span className="text-muted">{d.periodType.toLowerCase()}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function ScorecardGrid({ scorecard }: { scorecard: ScorecardRow[] }) {
  if (scorecard.length === 0) return null;
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {scorecard.map((c) => (
        <Card key={c.activity.id}>
          <CardTitle>{c.activity.name}</CardTitle>
          <p className="mt-2 text-4xl font-bold">{c.display}</p>
          {c.percentile != null && (
            <p className="text-accent">{c.percentile}th percentile</p>
          )}
          {c.yoy && <p className="text-sm text-muted">{c.yoy}</p>}
        </Card>
      ))}
    </div>
  );
}

export function LatestPersonalRecordsCard({
  prs,
}: {
  prs: { id: string; displayValue: string | null; activity: { name: string } }[];
}) {
  if (prs.length === 0) return null;
  return (
    <Card className="mt-6">
      <CardTitle>Latest personal records</CardTitle>
      <ul className="mt-4 space-y-2">
        {prs.map((p) => (
          <li key={p.id} className="flex justify-between">
            <span>{p.activity.name}</span>
            <span className="font-bold text-success">{p.displayValue}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ClassYearRankingCard({
  gradeLabel,
  ranks,
}: {
  gradeLabel: string;
  ranks: { activity: string; rank?: number; total: number }[];
}) {
  if (ranks.length === 0) return null;
  return (
    <Card className="mt-6">
      <CardTitle>{gradeLabel} ranking</CardTitle>
      <ul className="mt-4 space-y-2">
        {ranks.map((r) => (
          <li key={r.activity} className="flex justify-between text-sm">
            <span>{r.activity}</span>
            <span>{r.rank != null ? `#${r.rank} of ${r.total}` : "—"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
