import type { GameRow } from "@/types/database";

export type LibrarySource = "steam" | "steam_wishlist" | "retroachievements";

export type LibraryCandidate = {
  game: GameRow;
  source: LibrarySource;
  playtimeMinutes?: number;
};

export type GameSourceAdapter = {
  source: LibrarySource;
  sync(profileId: string, externalUserId: string): Promise<number>;
};
