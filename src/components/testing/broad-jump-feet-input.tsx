"use client";

import { cn } from "@/lib/utils";

/** Broad jump entry: feet + inches (0–11), stored as total inches. */
export function parseBroadJumpFeetInches(feetRaw: string, inchesRaw: string): number | null {
  const ft = feetRaw.trim() === "" ? 0 : Number(feetRaw);
  const inch = inchesRaw.trim() === "" ? 0 : Number(inchesRaw);
  if (Number.isNaN(ft) || Number.isNaN(inch)) return null;
  if (inch < 0 || inch > 11 || ft < 0) return null;
  if (feetRaw.trim() === "" && inchesRaw.trim() === "") return null;
  return ft * 12 + inch;
}

export function broadJumpToFeetInches(totalInches: number): { feet: string; inches: string } {
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches - ft * 12);
  return { feet: String(ft), inches: String(inch) };
}

export function BroadJumpFeetInput({
  feet,
  inches,
  onChange,
  disabled,
  large,
  inputRef,
  onCommit,
}: {
  feet: string;
  inches: string;
  onChange: (feet: string, inches: string) => void;
  disabled?: boolean;
  large?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  onCommit?: () => void;
}) {
  const boxClass = cn(
    "rounded-lg border border-card-border bg-background text-center font-semibold tabular-nums disabled:opacity-60",
    "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
    large ? "w-14 px-2 py-3 text-xl" : "w-12 px-1.5 py-2 text-lg"
  );

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        aria-label="Feet"
        className={boxClass}
        value={feet}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""), inches)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit?.();
          }
        }}
        onBlur={() => onCommit?.()}
      />
      <span className="text-xs font-semibold text-muted">ft</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        aria-label="Inches"
        className={boxClass}
        value={inches}
        onChange={(e) => {
          let v = e.target.value.replace(/\D/g, "");
          if (v !== "" && Number(v) > 11) v = "11";
          onChange(feet, v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit?.();
          }
        }}
        onBlur={() => onCommit?.()}
      />
      <span className="text-xs font-semibold text-muted">in</span>
    </div>
  );
}
