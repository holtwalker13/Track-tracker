"use client";

import { Check } from "lucide-react";
import { BottomSheet } from "@/components/compete/bottom-sheet";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";

export function EventPickerSheet({
  open,
  onClose,
  boards,
  selectedSlug,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  boards: LeaderboardBoard[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <BottomSheet open={open} title="Choose event" onClose={onClose}>
      {boards.length === 0 ? (
        <p className="py-6 text-sm text-muted">No ranked events for this group.</p>
      ) : (
        <ul className="divide-y divide-[#30373B]">
          {boards.map((board) => {
            const selected = board.activity.slug === selectedSlug;
            return (
              <li key={board.activity.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3.5 text-left text-base font-medium"
                  onClick={() => {
                    onSelect(board.activity.slug);
                    onClose();
                  }}
                >
                  {board.activity.name}
                  {selected ? (
                    <Check className="h-5 w-5 text-accent" aria-hidden />
                  ) : (
                    <span className="text-muted" aria-hidden>
                      →
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
