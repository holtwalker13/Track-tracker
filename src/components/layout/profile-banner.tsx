import { PlayerAvatar } from "@/components/athletes/player-avatar";

export function ProfileBanner({
  name,
  meta,
  seed,
}: {
  name: string;
  meta: string;
  seed?: string;
}) {
  return (
    <div className="mb-8 flex items-center gap-4 border-b border-card-border pb-6">
      <PlayerAvatar name={name} size="lg" seed={seed} />
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-muted">{meta}</p>
      </div>
    </div>
  );
}
