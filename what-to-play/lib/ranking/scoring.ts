import type {
  GameDifficultyCategory,
  GameDurationCategory,
  GameMetadata,
} from "@/types/game-metadata";
import { getEffectiveGameMetadata } from "@/lib/enrichment/game-metadata";

const difficultyFallback: Record<GameDifficultyCategory, number> = {
  easy: 3,
  medium: 5,
  hard: 8,
};

const durationMultiplier: Record<GameDurationCategory, number> = {
  short: 1,
  medium: 2,
  long: 3,
};

export function getGameScore(metadata: GameMetadata) {
  const effectiveMetadata = getEffectiveGameMetadata(metadata);
  const difficultyCategory =
    effectiveMetadata.difficulty_category ?? "medium";
  const durationCategory = effectiveMetadata.duration_category ?? "medium";
  const difficulty = Math.min(
    10,
    Math.max(
      1,
      metadata.difficulty_score ?? difficultyFallback[difficultyCategory],
    ),
  );
  const multiplier = durationMultiplier[durationCategory];
  const points = Math.round(difficulty * multiplier * 10) / 10;

  return {
    difficulty,
    difficultyCategory,
    durationCategory,
    multiplier,
    points,
  };
}

export function formatPoints(points: number) {
  return points.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(points) ? 0 : 1,
  });
}

export function completedGameSourceLabel(
  source: "retroachievements" | "steam" | "steam_wishlist",
  catalogOrigin?: string,
) {
  if (catalogOrigin === "steam_family") return "Steam Family";
  if (catalogOrigin === "instant_gaming") return "Instant Gaming";
  if (catalogOrigin === "manual_steam") return "Ajout manuel Steam";
  if (source === "retroachievements") return "RetroAchievements";
  if (source === "steam_wishlist") return "Wishlist Steam";
  return "Bibliotheque Steam";
}
