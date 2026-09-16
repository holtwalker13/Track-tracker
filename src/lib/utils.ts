import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStudentName(first: string, last: string, short = false) {
  if (short) return `${first} ${last.charAt(0)}.`;
  return `${first} ${last}`;
}

export function anonymousLabel(anonymousId: string) {
  return `Student ${anonymousId}`;
}
