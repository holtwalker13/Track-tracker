import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-sky-800 text-sky-100",
  "bg-emerald-800 text-emerald-100",
  "bg-violet-800 text-violet-100",
  "bg-amber-800 text-amber-100",
  "bg-rose-800 text-rose-100",
  "bg-teal-800 text-teal-100",
  "bg-indigo-800 text-indigo-100",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function playerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function PlayerAvatar({
  name,
  size = "md",
  className,
  seed,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Stable unique key so same-named athletes get different colors */
  seed?: string;
}) {
  const color = PALETTE[hashName(seed ?? name) % PALETTE.length];
  const dim =
    size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide",
        dim,
        color,
        className
      )}
      aria-hidden
    >
      {playerInitials(name)}
    </span>
  );
}
