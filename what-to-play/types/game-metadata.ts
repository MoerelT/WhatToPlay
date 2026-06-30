export type GameChallengeTier = "easy" | "medium" | "hard";
export type GameDurationCategory = "short" | "medium" | "long";
export type GameDifficultyCategory = "easy" | "medium" | "hard";
export type WheelSelectionStrategy = "random" | "difficulty" | "duration" | "balanced";

export type GameMetadata = {
  challenge_tier?: GameChallengeTier;
  difficulty_category?: GameDifficultyCategory;
  difficulty_model_version?: number;
  difficulty_score?: number;
  difficulty_source?: "psnprofiles" | "psthc" | "steam_achievements" | "fallback";
  duration_category?: GameDurationCategory;
  hltb_hours?: number;
  hltb_source?: "howlongtobeat" | "fallback";
  released_at?: string;
  series_key?: string;
  series_order?: number;
  series_source?: "title_rule";
  steam_appid?: string;
};
