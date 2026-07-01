import type {
  DifficultyLevel,
  SlotType,
  UserGameStatus,
  ValidationType,
} from "./backlog";

export type ProfileRow = {
  id: string;
  steam_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  is_steam_profile_public: boolean | null;
};

export type GameRow = {
  id: string;
  name: string;
  cover_url: string | null;
  header_url: string | null;
  metadata: Record<string, unknown>;
};

export type UserGameRow = {
  catalog_origin?: string;
  id: string;
  profile_id: string;
  game_id: string;
  wheel_id: string | null;
  status: UserGameStatus;
  slot_type: SlotType;
  validation: ValidationType;
  games?: GameRow;
  source?: "retroachievements" | "steam" | "steam_wishlist";
};

export type WheelRow = {
  id: string;
  profile_id: string;
  name: string;
  difficulty: DifficultyLevel;
  validation: ValidationType;
  is_active: boolean;
  created_at?: string;
};
