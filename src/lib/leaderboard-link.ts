export type LeaderboardHighlight = {
  slug: string;
  rank: number;
  scope: "school" | "global";
};

export function leaderboardHighlightFromSearch(sp: {
  lb?: string;
  rank?: string;
  scope?: string;
}): LeaderboardHighlight | null {
  const slug = sp.lb?.trim();
  const rank = Number(sp.rank);
  if (!slug || !Number.isFinite(rank) || rank < 1) return null;
  return {
    slug,
    rank: Math.floor(rank),
    scope: sp.scope === "global" ? "global" : "school",
  };
}

export function leaderboardProfileQuery(
  activitySlug: string,
  rank: number,
  scope: "school" | "global" = "school"
) {
  const qs = new URLSearchParams({
    activity: activitySlug,
    lb: activitySlug,
    rank: String(rank),
    scope,
  });
  return qs.toString();
}

export function resultCardAnchor(slug: string) {
  return `result-${slug}`;
}

export function ordinalRank(rank: number) {
  const v = rank % 100;
  if (v >= 11 && v <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}
