import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { ActivityIcon } from "@/lib/activity-icons";
import { DISPLAY_GROUP_LABELS, DISPLAY_GROUP_ORDER } from "@/lib/activity-groups";
import { classYearLabel } from "@/lib/grades";
import { cn, boxScoreNameFromFull } from "@/lib/utils";
import type { AthleteLineupView } from "@/lib/queries/compare";

const ACCENTS = [
  "text-sky-400",
  "text-amber-300",
  "text-emerald-400",
  "text-violet-400",
  "text-rose-400",
];

export function AthleteLineup({ view }: { view: AthleteLineupView }) {
  const { athletes, events } = view;
  const cols = athletes.length;

  return (
    <div className="overflow-x-auto rounded-2xl border border-card-border bg-card px-3 py-5 sm:px-6">
      <p className="mb-4 text-center text-xs uppercase tracking-widest text-muted">
        Side-by-side · {cols} athletes
        <span className="mt-1 block font-normal normal-case tracking-normal">Season bests</span>
      </p>
      <div
        className="mb-6 grid items-start gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(7rem, 1fr))` }}
      >
        {athletes.map((a, i) => (
          <div key={a.id} className="flex flex-col items-center text-center">
            <PlayerAvatar name={a.name} size="lg" seed={a.id} />
            <p className={cn("mt-2 font-bold", ACCENTS[i % ACCENTS.length])}>
              {boxScoreNameFromFull(a.name)}
            </p>
            <p className="text-xs text-muted">{classYearLabel(a.grade)}</p>
          </div>
        ))}
      </div>

      {DISPLAY_GROUP_ORDER.map((group) => {
        const rows = events.filter((e) => e.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group} className="mb-6 last:mb-0">
            <p className="mb-2 text-sm font-semibold text-muted">{DISPLAY_GROUP_LABELS[group]}</p>
            {rows.map((row) => {
              const values = athletes
                .map((a) => row.marks[a.id]?.value)
                .filter((v): v is number => v != null);
              const best =
                values.length === 0
                  ? null
                  : row.direction === "HIGHER_BETTER"
                    ? Math.max(...values)
                    : Math.min(...values);
              if (values.length === 0) return null;
              return (
                <div key={row.activityId} className="border-b border-card-border/40 py-2">
                  <div className="mb-1 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                    <ActivityIcon slug={row.activitySlug} categorySlug={row.categorySlug} className="h-3.5 w-3.5" />
                    {row.activityName}
                  </div>
                  <div
                    className="grid gap-2 text-center font-mono text-sm font-bold tabular-nums"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(7rem, 1fr))` }}
                  >
                    {athletes.map((a, i) => {
                      const mark = row.marks[a.id];
                      const win = mark?.value != null && best != null && mark.value === best;
                      return (
                        <span
                          key={a.id}
                          className={cn(win ? ACCENTS[i % ACCENTS.length] : "text-muted")}
                        >
                          {mark?.display ?? "—"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
