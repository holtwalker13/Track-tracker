import { cn } from "@/lib/utils";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import {
  getAccoladeLucideIcon,
  themeForAccoladeCategory,
} from "@/lib/gamification/accolade-theme";

const SIZE = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
} as const;

export function AccoladeIcon({
  slug,
  category,
  earned = true,
  size = "md",
  className,
}: {
  slug: string;
  category: AccoladeCategory;
  earned?: boolean;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const theme = themeForAccoladeCategory(category);
  const Icon = getAccoladeLucideIcon(slug, category);
  const s = SIZE[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        s.box,
        earned ? theme.iconBg : "border-card-border/60 bg-card-border/20",
        className
      )}
      aria-hidden
    >
      <Icon
        className={cn(s.icon, earned ? theme.iconColor : "text-muted/70")}
        strokeWidth={2.25}
      />
    </span>
  );
}
