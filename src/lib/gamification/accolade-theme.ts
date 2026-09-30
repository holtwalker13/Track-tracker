import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  CalendarCheck,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";

export type AccoladeCategoryTheme = {
  label: string;
  iconColor: string;
  iconBg: string;
  cardBorder: string;
  cardBg: string;
  sectionAccent: string;
  progressBar: string;
  chipBg: string;
  chipText: string;
};

export const ACCOLADE_CATEGORY_THEME: Record<AccoladeCategory, AccoladeCategoryTheme> = {
  consistency: {
    label: "Consistency",
    iconColor: "text-sport-red",
    iconBg: "bg-sport-red/25 border-sport-red/50",
    cardBorder: "border-sport-red/40",
    cardBg: "bg-sport-red/8",
    sectionAccent: "text-sport-red",
    progressBar: "bg-sport-red",
    chipBg: "bg-sport-red/20",
    chipText: "text-sport-red",
  },
  prs: {
    label: "PRs",
    iconColor: "text-sport-gold",
    iconBg: "bg-sport-gold/25 border-sport-gold/50",
    cardBorder: "border-sport-gold/45",
    cardBg: "bg-sport-gold/10",
    sectionAccent: "text-sport-gold",
    progressBar: "bg-sport-gold",
    chipBg: "bg-sport-gold/20",
    chipText: "text-sport-gold",
  },
  improvement: {
    label: "Improvement",
    iconColor: "text-accent",
    iconBg: "bg-accent/25 border-accent/50",
    cardBorder: "border-accent/45",
    cardBg: "bg-accent/10",
    sectionAccent: "text-accent",
    progressBar: "bg-accent",
    chipBg: "bg-accent/20",
    chipText: "text-accent",
  },
  strength: {
    label: "Strength",
    iconColor: "text-sport-green",
    iconBg: "bg-sport-green/25 border-sport-green/50",
    cardBorder: "border-sport-green/45",
    cardBg: "bg-sport-green/10",
    sectionAccent: "text-sport-green",
    progressBar: "bg-sport-green",
    chipBg: "bg-sport-green/20",
    chipText: "text-sport-green",
  },
  milestones: {
    label: "Training milestones",
    iconColor: "text-sport-bronze",
    iconBg: "bg-sport-bronze/25 border-sport-bronze/50",
    cardBorder: "border-sport-bronze/45",
    cardBg: "bg-sport-bronze/10",
    sectionAccent: "text-sport-bronze",
    progressBar: "bg-sport-bronze",
    chipBg: "bg-sport-bronze/20",
    chipText: "text-sport-bronze",
  },
};

const SLUG_ICON: Record<string, LucideIcon> = {
  "on-fire": Flame,
  unstoppable: Sparkles,
  "perfect-week": CalendarCheck,
  "first-pr": Trophy,
  "pr-machine": Award,
  breakthrough: Zap,
  "club-500": Dumbbell,
  "club-750": Dumbbell,
  "club-1000": Dumbbell,
  "workouts-25": Target,
  "workouts-50": Medal,
  "workouts-100": Medal,
  "pr-leader": Crown,
  "most-improved": TrendingUp,
  "streak-leader": Flame,
  "volume-leader": BarChart3,
};

const CATEGORY_DEFAULT_ICON: Record<AccoladeCategory, LucideIcon> = {
  consistency: Flame,
  prs: Trophy,
  improvement: TrendingUp,
  strength: Dumbbell,
  milestones: Medal,
};

export function getAccoladeLucideIcon(slug: string, category?: AccoladeCategory): LucideIcon {
  if (SLUG_ICON[slug]) return SLUG_ICON[slug]!;
  if (category) return CATEGORY_DEFAULT_ICON[category];
  return Award;
}

export function themeForAccoladeCategory(category: AccoladeCategory): AccoladeCategoryTheme {
  return ACCOLADE_CATEGORY_THEME[category];
}
