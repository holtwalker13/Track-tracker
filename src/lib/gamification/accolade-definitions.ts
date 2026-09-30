export type AccoladeCategory =
  | "consistency"
  | "prs"
  | "improvement"
  | "strength"
  | "milestones";

export type AccoladeKind = "STATIC" | "DYNAMIC";

import type { Prisma } from "@prisma/client";

export type AccoladeSeed = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  category: AccoladeCategory;
  kind: AccoladeKind;
  sortOrder: number;
  config?: Prisma.InputJsonValue;
};

export const STATIC_ACCOLADES: AccoladeSeed[] = [
  {
    slug: "on-fire",
    name: "On Fire",
    description: "10 consecutive assigned workouts completed.",
    emoji: "🔥",
    category: "consistency",
    kind: "STATIC",
    sortOrder: 10,
    config: { streakMin: 10 },
  },
  {
    slug: "unstoppable",
    name: "Unstoppable",
    description: "25 consecutive assigned workouts completed.",
    emoji: "🔥",
    category: "consistency",
    kind: "STATIC",
    sortOrder: 20,
    config: { streakMin: 25 },
  },
  {
    slug: "perfect-week",
    name: "Perfect Week",
    description: "Completed every assigned workout in a calendar week.",
    emoji: "✅",
    category: "consistency",
    kind: "STATIC",
    sortOrder: 30,
  },
  {
    slug: "first-pr",
    name: "First PR",
    description: "Set your first personal record.",
    emoji: "🏆",
    category: "prs",
    kind: "STATIC",
    sortOrder: 40,
  },
  {
    slug: "pr-machine",
    name: "PR Machine",
    description: "Set 10 personal records.",
    emoji: "🏆",
    category: "prs",
    kind: "STATIC",
    sortOrder: 50,
    config: { prCountMin: 10 },
  },
  {
    slug: "breakthrough",
    name: "Breakthrough",
    description: "Improved three different tracked lifts.",
    emoji: "⚡",
    category: "improvement",
    kind: "STATIC",
    sortOrder: 60,
    config: { improvedLiftCountMin: 3 },
  },
  {
    slug: "club-500",
    name: "500 LB Club",
    description: "Combined squat, bench, and hang clean total ≥ 500 lbs.",
    emoji: "🏋️",
    category: "strength",
    kind: "STATIC",
    sortOrder: 70,
    config: { totalLbMin: 500 },
  },
  {
    slug: "club-750",
    name: "750 LB Club",
    description: "Combined squat, bench, and hang clean total ≥ 750 lbs.",
    emoji: "🏋️",
    category: "strength",
    kind: "STATIC",
    sortOrder: 80,
    config: { totalLbMin: 750 },
  },
  {
    slug: "club-1000",
    name: "1,000 LB Club",
    description: "Combined squat, bench, and hang clean total ≥ 1,000 lbs.",
    emoji: "🏋️",
    category: "strength",
    kind: "STATIC",
    sortOrder: 90,
    config: { totalLbMin: 1000 },
  },
  {
    slug: "workouts-25",
    name: "25 Workouts",
    description: "Completed 25 assigned workouts.",
    emoji: "💪",
    category: "milestones",
    kind: "STATIC",
    sortOrder: 100,
    config: { workoutCountMin: 25 },
  },
  {
    slug: "workouts-50",
    name: "50 Workouts",
    description: "Completed 50 assigned workouts.",
    emoji: "💪",
    category: "milestones",
    kind: "STATIC",
    sortOrder: 110,
    config: { workoutCountMin: 50 },
  },
  {
    slug: "workouts-100",
    name: "100 Workouts",
    description: "Completed 100 assigned workouts.",
    emoji: "💪",
    category: "milestones",
    kind: "STATIC",
    sortOrder: 120,
    config: { workoutCountMin: 100 },
  },
];

export const DYNAMIC_ACCOLADES: AccoladeSeed[] = [
  {
    slug: "pr-leader",
    name: "PR Leader",
    description: "Most PRs in the period.",
    emoji: "👑",
    category: "prs",
    kind: "DYNAMIC",
    sortOrder: 200,
  },
  {
    slug: "most-improved",
    name: "Most Improved",
    description: "Highest qualifying improvement in the period.",
    emoji: "📈",
    category: "improvement",
    kind: "DYNAMIC",
    sortOrder: 210,
  },
  {
    slug: "streak-leader",
    name: "Streak Leader",
    description: "Longest active workout streak in the period.",
    emoji: "🔥",
    category: "consistency",
    kind: "DYNAMIC",
    sortOrder: 220,
  },
  {
    slug: "volume-leader",
    name: "Volume Leader",
    description: "Most qualifying training volume in the period.",
    emoji: "💪",
    category: "milestones",
    kind: "DYNAMIC",
    sortOrder: 230,
  },
];

export const ALL_ACCOLADE_SEEDS = [...STATIC_ACCOLADES, ...DYNAMIC_ACCOLADES];

export const ACCOLADE_CATEGORY_LABELS: Record<AccoladeCategory, string> = {
  consistency: "Consistency",
  prs: "PRs",
  improvement: "Improvement",
  strength: "Strength",
  milestones: "Training milestones",
};

/** Major lifts for strength club totals (absolute lb 1RM/e1RM). */
export const CLUB_LIFT_SLUGS = ["squat", "bench-press", "hang-clean"] as const;
