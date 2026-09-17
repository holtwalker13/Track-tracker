import {
  Timer,
  Zap,
  TrendingUp,
  Dumbbell,
  Activity,
  Wind,
  Target,
  Footprints,
  type LucideIcon,
} from "lucide-react";
import { activityDisplayGroup } from "@/lib/activity-groups";

const SLUG_ICON: Record<string, LucideIcon> = {
  "vertical-jump": TrendingUp,
  "standing-broad-jump": Zap,
  "40-yard-dash": Timer,
  "50-yard-dash": Timer,
  "100-meter-dash": Timer,
  "flying-10-meter": Timer,
  "flying-10-yard": Timer,
  "flying-20-meter": Timer,
  "20-meter-start": Timer,
  "mile-run": Footprints,
  "800-meter-run": Footprints,
  "shuttle-run": Activity,
  "pro-agility": Activity,
  "pull-ups": Dumbbell,
  "push-ups": Dumbbell,
  "bench-press": Dumbbell,
  squat: Dumbbell,
  "squat-relative": Dumbbell,
  "hang-clean": Dumbbell,
  "hang-clean-relative": Dumbbell,
  "sit-and-reach": Wind,
  "sit-ups": Target,
  plank: Target,
};

export function getActivityIcon(slug: string, categorySlug?: string): LucideIcon {
  if (SLUG_ICON[slug]) return SLUG_ICON[slug]!;
  const g = activityDisplayGroup(slug, categorySlug);
  if (g === "running") return Timer;
  if (g === "jumping") return Zap;
  return Dumbbell;
}

export function activityIconColor(slug: string, categorySlug?: string): string {
  const g = activityDisplayGroup(slug, categorySlug);
  if (g === "running") return "text-sport-red";
  if (g === "jumping") return "text-sport-gold";
  return "text-sport-green";
}

export function ActivityIcon({
  slug,
  categorySlug,
  className = "h-5 w-5",
}: {
  slug: string;
  categorySlug?: string;
  className?: string;
}) {
  const Icon = getActivityIcon(slug, categorySlug);
  const color = activityIconColor(slug, categorySlug);
  return <Icon className={`${color} ${className}`} aria-hidden />;
}
