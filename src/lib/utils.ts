import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStudentName(first: string, last: string, short = false) {
  if (short) return `${first} ${last.charAt(0)}.`;
  return `${first} ${last}`;
}

/** NFL-style "B. Purdy" */
export function boxScoreName(first: string, last: string) {
  const initial = first.charAt(0).toUpperCase();
  return `${initial}. ${last}`;
}

export function boxScoreNameFromFull(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return full;
  return boxScoreName(parts[0]!, parts.slice(1).join(" "));
}

export function anonymousLabel(anonymousId: string) {
  return `Student ${anonymousId}`;
}
