import type { DifficultyLevel, DifficultyRule, SlotType } from "@/types/backlog";

export const DIFFICULTY_RULES: Record<DifficultyLevel, DifficultyRule> = {
  hard: {
    regularSlots: 3,
    freeSlots: 0,
  },
  medium: {
    regularSlots: 5,
    freeSlots: 1,
  },
  easy: {
    regularSlots: 7,
    freeSlots: 2,
  },
};

export function getAvailableSlots(
  difficulty: DifficultyLevel,
  counts: Record<SlotType, number>,
) {
  const rule = DIFFICULTY_RULES[difficulty];

  return {
    regular: Math.max(rule.regularSlots - counts.regular, 0),
    free: Math.max(rule.freeSlots - counts.free, 0),
  };
}
