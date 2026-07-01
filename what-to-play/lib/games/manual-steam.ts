import {
  inferGameSeriesKey,
  inferGameSeriesOrder,
} from "@/lib/backlog/series";
import { enrichGameMetadata } from "@/lib/enrichment/game-metadata";
import {
  getSteamAchievementSummary,
  getSteamGlobalAchievementData,
  getSteamStoreMetadata,
} from "@/lib/steam/api";
import {
  ensureSteamGame,
} from "@/lib/sources/steam-source";
import {
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/supabase/rest";
import type { GameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

type LibraryEntry = {
  last_played_at: string | null;
  playtime_minutes: number;
  raw_data: Record<string, unknown>;
};

export async function addManualSteamGame(
  profileId: string,
  steamId: string,
  appid: number,
) {
  const [store, achievements, globalAchievements] = await Promise.all([
    getSteamStoreMetadata(appid),
    getSteamAchievementSummary(steamId, appid),
    getSteamGlobalAchievementData(appid),
  ]);

  if (!store?.name) {
    return { status: "not_found" as const };
  }

  const achievementTotal =
    achievements.achievement_total || globalAchievements?.achievementTotal || 0;

  if (achievementTotal === 0) {
    return { status: "no_achievements" as const };
  }

  const game = await ensureSteamGame({
    appid: String(appid),
    name: store.name,
    coverUrl: null,
    headerUrl:
      store.headerUrl ??
      `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
  });
  const currentMetadata = game.metadata as GameMetadata;
  const seriesKey =
    currentMetadata.series_key ?? inferGameSeriesKey(store.name);
  const baseMetadata: GameMetadata = {
    ...currentMetadata,
    released_at:
      currentMetadata.released_at ?? store.releasedAt ?? undefined,
    series_key: seriesKey ?? undefined,
    series_order:
      currentMetadata.series_order ??
      inferGameSeriesOrder(store.name, seriesKey) ??
      undefined,
    series_source:
      currentMetadata.series_source ??
      (seriesKey ? "title_rule" : undefined),
    steam_appid: String(appid),
  };
  const metadata = await enrichGameMetadata(
    store.name,
    baseMetadata,
    globalAchievements?.difficultyScore,
    appid,
  );

  if (
    JSON.stringify(metadata) !== JSON.stringify(currentMetadata) ||
    game.header_url !== store.headerUrl
  ) {
    await updateRows<GameRow>(
      "games",
      {
        header_url: store.headerUrl ?? game.header_url,
        metadata,
        name: store.name,
      },
      { id: `eq.${game.id}` },
    );
  }

  const existingEntries = await selectRows<LibraryEntry>(
    "user_library_entries",
    {
      profile_id: `eq.${profileId}`,
      game_id: `eq.${game.id}`,
      source: "eq.steam",
      select: "playtime_minutes,last_played_at,raw_data",
      limit: 1,
    },
  );
  const existing = existingEntries[0];

  await upsertRows(
    "user_library_entries",
    [
      {
        profile_id: profileId,
        game_id: game.id,
        source: "steam",
        playtime_minutes: existing?.playtime_minutes ?? 0,
        last_played_at: existing?.last_played_at ?? null,
        raw_data: {
          ...(existing?.raw_data ?? {}),
          achievement_total: achievementTotal,
          achievement_unlocked: achievements.achievement_unlocked,
          achievements_completed:
            achievements.achievement_total > 0 &&
            achievements.achievements_completed,
          catalog_origin: "manual_steam",
          has_community_visible_stats: true,
          manual_add: true,
          steam_appid: appid,
        },
      },
    ],
    "profile_id,game_id,source",
  );

  await updateRows(
    "user_games",
    {
      completed_at: null,
      status: "available",
    },
    {
      profile_id: `eq.${profileId}`,
      game_id: `eq.${game.id}`,
      status: "eq.abandoned",
    },
  );

  return {
    game: {
      game_id: game.id,
      name: store.name,
    },
    status: existing ? "updated" as const : "added" as const,
  };
}
