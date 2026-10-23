import { isHiddenStudentLeaderboardLabel } from "@/lib/leaderboard-privacy";
import { cn } from "@/lib/utils";

export function LeaderboardEntryName({
  name,
  nameHidden,
  className,
}: {
  name: string;
  nameHidden?: boolean;
  className?: string;
}) {
  const hidden = nameHidden ?? isHiddenStudentLeaderboardLabel(name);
  return (
    <span
      className={cn(hidden && "italic text-muted", className)}
      title={hidden ? "Hidden from other students on leaderboards" : undefined}
    >
      {name}
    </span>
  );
}
