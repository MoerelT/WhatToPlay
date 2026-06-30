import { inferGameSeriesKey, inferGameSeriesOrder } from "@/lib/backlog/series";
import { enrichGameMetadata } from "@/lib/enrichment/game-metadata";
import {
  getSteamGlobalAchievementData,
  getSteamStoreMetadata,
  getSteamWishlist,
} from "@/lib/steam/api";
import {
  ensureSteamGame,
  findSteamGameByAppId,
} from "@/lib/sources/steam-source";
import { updateRows, upsertRows } from "@/lib/supabase/rest";
import type { GameSourceAdapter } from "@/lib/sources/types";
import type { GameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

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

export const steamWishlistSource: GameSourceAdapter = {
  source: "steam_wishlist",
  async sync(profileId: string, steamId: string) {
    const wishlist = await getSteamWishlist(steamId);
    let imported = 0;

    await processWithConcurrency(wishlist, 6, async (item) => {
      const existingGame = await findSteamGameByAppId(String(item.appid));
      const [store, achievements] = await Promise.all([
        existingGame ? null : getSteamStoreMetadata(item.appid),
        getSteamGlobalAchievementData(item.appid),
      ]);

      const gameName = existingGame?.name ?? store?.name;

      if (!gameName) {
        return;
      }

      const game =
        existingGame ??
        await ensureSteamGame({
          appid: String(item.appid),
          name: gameName,
          coverUrl: null,
          headerUrl:
            store?.headerUrl ??
            `https://cdn.akamai.steamstatic.com/steam/apps/${item.appid}/header.jpg`,
        });
      const currentMetadata = game.metadata as GameMetadata;
      const seriesKey =
        currentMetadata.series_key ?? inferGameSeriesKey(gameName);
      let metadata: GameMetadata = {
        ...currentMetadata,
        released_at:
          currentMetadata.released_at ?? store?.releasedAt ?? undefined,
        series_key: seriesKey ?? undefined,
        series_order:
          currentMetadata.series_order ??
          inferGameSeriesOrder(gameName, seriesKey) ??
          undefined,
        series_source:
          currentMetadata.series_source ??
          (seriesKey ? "title_rule" : undefined),
      };

      if (
        achievements &&
        (
          !metadata.duration_category ||
          !metadata.difficulty_category ||
          !metadata.challenge_tier ||
          metadata.difficulty_model_version !== 2
        )
      ) {
        metadata = await enrichGameMetadata(
          gameName,
          metadata,
          achievements.difficultyScore,
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
            source: "steam_wishlist",
            raw_data: {
              achievement_total: achievements?.achievementTotal ?? 0,
              achievement_unlocked: 0,
              achievements_completed: false,
              date_added: item.date_added,
              has_community_visible_stats:
                (achievements?.achievementTotal ?? 0) > 0,
              priority: item.priority,
              wishlist: true,
            },
          },
        ],
        "profile_id,game_id,source",
      );

      imported += 1;
    });

    return imported;
  },
};
