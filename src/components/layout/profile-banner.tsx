import { PlayerAvatar } from "@/components/athletes/player-avatar";

export function ProfileBanner({
  name,
  meta,
  seed,
  sports,
  classLabel,
}: {
  name: string;
  meta: string;
  seed?: string;
  sports?: string | null;
  classLabel?: string | null;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-card-border bg-gradient-to-br from-card via-card to-sky-950/30 p-5 shadow-[0_0_40px_rgba(56,189,248,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <PlayerAvatar name={name} size="lg" seed={seed} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Athlete profile
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
          <p className="mt-2 text-sm text-muted">{meta}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {classLabel && (
              <span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/40">
                {classLabel}
              </span>
            )}
            {sports ? (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/30">
                {sports}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                PE / general tracking
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
