import {
  getSteamAchievementDifficultyScore,
  getSteamAchievementSummary,
  getSteamOwnedGames,
  getSteamStoreMetadata,
} from "@/lib/steam/api";
import { mapSteamGame } from "@/lib/steam/mapper";
import { enrichGameMetadata } from "@/lib/enrichment/game-metadata";
import {
  inferGameSeriesKey,
  inferGameSeriesOrder,
} from "@/lib/backlog/series";
import { insertRows, selectRows, updateRows, upsertRows } from "@/lib/supabase/rest";
import type { GameSourceAdapter } from "@/lib/sources/types";
import type { GameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";
import type { SteamOwnedGame } from "@/types/steam";

type ExternalIdRow = {
  game_id: string;
};

async function findGameBySteamAppId(appid: string) {
  const rows = await selectRows<ExternalIdRow>("game_external_ids", {
    source: "eq.steam",
    external_id: `eq.${appid}`,
    select: "game_id",
    limit: 1,
  });

  return rows[0]?.game_id ?? null;
}

export async function findSteamGameByAppId(appid: string) {
  const gameId = await findGameBySteamAppId(appid);

  if (!gameId) {
    return null;
  }

  const rows = await selectRows<GameRow>("games", {
    id: `eq.${gameId}`,
    select: "*",
    limit: 1,
  });

  return rows[0] ?? null;
}

type SteamCatalogGame = Pick<
  ReturnType<typeof mapSteamGame>,
  "appid" | "coverUrl" | "headerUrl" | "name"
>;

export async function ensureSteamGame(game: SteamCatalogGame) {
  const existing = await findSteamGameByAppId(game.appid);

  if (existing) {
    return existing;
  }

  const created = await insertRows<GameRow>("games", [
    {
      name: game.name,
      cover_url: game.coverUrl,
      header_url: game.headerUrl,
      metadata: {
        steam_appid: game.appid,
      },
    },
  ]);

  const createdGame = created[0];

  await insertRows("game_external_ids", [
    {
      game_id: createdGame.id,
      source: "steam",
      external_id: game.appid,
    },
  ]);

  return createdGame;
}

async function syncSteamGame(
  profileId: string,
  steamId: string,
  steamGame: SteamOwnedGame,
) {
  const mapped = mapSteamGame(steamGame);
  const [achievements, steamDifficultyScore] =
    steamGame.has_community_visible_stats
      ? await Promise.all([
          getSteamAchievementSummary(steamId, steamGame.appid),
          getSteamAchievementDifficultyScore(steamGame.appid),
        ])
      : [
          {
            achievement_total: 0,
            achievement_unlocked: 0,
            achievements_completed: false,
          },
          null,
        ];
  const game = await ensureSteamGame(mapped);
  const currentMetadata = game.metadata as GameMetadata;
  const storeMetadata =
    steamGame.has_community_visible_stats && !currentMetadata.released_at
      ? await getSteamStoreMetadata(steamGame.appid)
      : null;
  const inferredSeriesKey = inferGameSeriesKey(mapped.name);
  let metadata: GameMetadata = {
    ...currentMetadata,
    released_at:
      currentMetadata.released_at ?? storeMetadata?.releasedAt ?? undefined,
    series_key:
      currentMetadata.series_key ?? inferredSeriesKey ?? undefined,
    series_order:
      currentMetadata.series_order ??
      inferGameSeriesOrder(mapped.name, inferredSeriesKey) ??
      undefined,
    series_source:
      currentMetadata.series_source ??
      (inferredSeriesKey ? "title_rule" : undefined),
  };

  const needsMetadata =
    steamGame.has_community_visible_stats &&
    (
      !metadata.duration_category ||
      !metadata.difficulty_category ||
      !metadata.challenge_tier ||
      metadata.difficulty_model_version !== 3 ||
      !metadata.difficulty_source ||
      metadata.difficulty_source === "fallback" ||
      (metadata.hltb_source === "fallback" && !metadata.hltb_hours)
    );

  if (needsMetadata) {
    metadata = await enrichGameMetadata(
      mapped.name,
      metadata,
      steamDifficultyScore,
      steamGame.appid,
    );
  }

  if (JSON.stringify(metadata) !== JSON.stringify(currentMetadata)) {
    await updateRows<GameRow>(
      "games",
      { metadata },
      { id: `eq.${game.id}` },
    );
  }

  await upsertRows(
    "user_library_entries",
    [
      {
        profile_id: profileId,
        game_id: game.id,
        source: "steam",
        playtime_minutes: mapped.playtimeMinutes,
        last_played_at: mapped.lastPlayedAt,
        raw_data: {
          ...mapped.rawData,
          ...achievements,
        },
      },
    ],
    "profile_id,game_id,source",
  );
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runWorker(),
    ),
  );
}

export const steamSource: GameSourceAdapter = {
  source: "steam",
  async sync(profileId: string, steamId: string) {
    const games = await getSteamOwnedGames(steamId);
    const activeGames = await selectRows<{
      games: { metadata: GameMetadata };
    }>("user_games", {
      profile_id: `eq.${profileId}`,
      status: "eq.in_progress",
      select: "games(metadata)",
    });
    const activeAppIds = new Set(
      activeGames
        .map((entry) => entry.games.metadata.steam_appid)
        .filter((appid): appid is string => Boolean(appid)),
    );
    const orderedGames = [...games].sort(
      (left, right) =>
        Number(activeAppIds.has(String(right.appid))) -
        Number(activeAppIds.has(String(left.appid))),
    );

    await processWithConcurrency(
      orderedGames,
      6,
      (game) => syncSteamGame(profileId, steamId, game),
    );

    return games.length;
  },
};
