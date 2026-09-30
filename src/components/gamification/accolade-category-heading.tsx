import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import {
  getAccoladeLucideIcon,
  themeForAccoladeCategory,
} from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";

export function AccoladeCategoryHeading({
  category,
  label,
}: {
  category: AccoladeCategory;
  label: string;
}) {
  const theme = themeForAccoladeCategory(category);
  const Icon = getAccoladeLucideIcon("", category);

  return (
    <h2 className="flex items-center gap-2.5 text-lg font-bold">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border",
          theme.iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", theme.iconColor)} strokeWidth={2.25} aria-hidden />
      </span>
      <span className={theme.sectionAccent}>{label}</span>
    </h2>
  );
}
