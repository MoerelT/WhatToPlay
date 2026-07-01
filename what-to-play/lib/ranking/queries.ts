import { getGameScore } from "@/lib/ranking/scoring";
import { selectRows } from "@/lib/supabase/rest";
import type { GameRow, ProfileRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

type CompletedLibraryRow = {
  game_id: string;
  profile_id: string;
  source: "retroachievements" | "steam" | "steam_wishlist";
  raw_data: {
    achievements_completed?: boolean;
    catalog_origin?: string;
  };
  games: GameRow;
  profiles: ProfileRow;
};

export type RankedCompletedGame = ReturnType<typeof rankCompletedGame>;

export type UserLeaderboardEntry = {
  completedCount: number;
  profile: ProfileRow;
  rank: number;
  topGames: RankedCompletedGame[];
  totalPoints: number;
};

const sourcePriority: Record<CompletedLibraryRow["source"], number> = {
  steam: 3,
  retroachievements: 2,
  steam_wishlist: 1,
};

function rankCompletedGame(entry: CompletedLibraryRow) {
  const metadata = entry.games.metadata as GameMetadata;
  const score = getGameScore(metadata);

  return {
    catalogOrigin: entry.raw_data.catalog_origin,
    difficulty: score.difficulty,
    difficultyCategory: score.difficultyCategory,
    durationCategory: score.durationCategory,
    durationHours: metadata.hltb_hours,
    gameId: entry.game_id,
    headerUrl: entry.games.header_url,
    multiplier: score.multiplier,
    name: entry.games.name,
    points: score.points,
    source: entry.source,
  };
}

function sortRankedGames(games: RankedCompletedGame[]) {
  return games.sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name, "fr"),
  );
}

export async function getRankingData(currentProfileId: string) {
  const rows = await selectRows<CompletedLibraryRow>(
    "user_library_entries",
    {
      "raw_data->>achievements_completed": "eq.true",
      select:
        "profile_id,game_id,source,raw_data,games(*),profiles(*)",
    },
  );
  const preferredEntries = new Map<string, CompletedLibraryRow>();

  for (const entry of rows) {
    if (
      entry.raw_data?.achievements_completed !== true ||
      !entry.games ||
      !entry.profiles
    ) {
      continue;
    }

    const key = `${entry.profile_id}:${entry.game_id}`;
    const current = preferredEntries.get(key);

    if (
      !current ||
      sourcePriority[entry.source] > sourcePriority[current.source]
    ) {
      preferredEntries.set(key, entry);
    }
  }

  const gamesByProfile = new Map<
    string,
    { games: RankedCompletedGame[]; profile: ProfileRow }
  >();

  for (const entry of preferredEntries.values()) {
    const current = gamesByProfile.get(entry.profile_id) ?? {
      games: [],
      profile: entry.profiles,
    };
    current.games.push(rankCompletedGame(entry));
    gamesByProfile.set(entry.profile_id, current);
  }

  const leaderboardWithoutRanks = [...gamesByProfile.values()]
    .map(({ games, profile }) => {
      const rankedGames = sortRankedGames(games);

      return {
        completedCount: rankedGames.length,
        profile,
        topGames: rankedGames.slice(0, 3),
        totalPoints:
          Math.round(
            rankedGames.reduce((total, game) => total + game.points, 0) * 10,
          ) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.completedCount - a.completedCount ||
        (a.profile.display_name ?? a.profile.steam_id).localeCompare(
          b.profile.display_name ?? b.profile.steam_id,
          "fr",
        ),
    );
  let previousPoints: number | null = null;
  let previousRank = 0;
  const leaderboard: UserLeaderboardEntry[] = leaderboardWithoutRanks.map(
    (entry, index) => {
      const rank =
        previousPoints === entry.totalPoints ? previousRank : index + 1;
      previousPoints = entry.totalPoints;
      previousRank = rank;

      return { ...entry, rank };
    },
  );
  const currentGames =
    gamesByProfile.get(currentProfileId)?.games ?? [];

  return {
    currentGames: sortRankedGames(currentGames),
    leaderboard,
  };
}
