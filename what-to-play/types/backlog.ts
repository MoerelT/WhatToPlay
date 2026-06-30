export type DifficultyLevel = "hard" | "medium" | "easy";
export type SlotType = "regular" | "free";
export type ValidationType = "story" | "achievements";
export type WheelSelectionStrategy = "random" | "difficulty" | "duration" | "balanced";
export type UserGameStatus =
  | "available"
  | "in_progress"
  | "story_completed"
  | "achievements_completed"
  | "completed"
  | "abandoned";

export type DifficultyRule = {
  regularSlots: number;
  freeSlots: number;
};

export type WheelConfig = {
  id: string;
  difficulty: DifficultyLevel;
  selectionStrategy?: WheelSelectionStrategy;
  validation: ValidationType;
};
