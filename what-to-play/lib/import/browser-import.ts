import { enrichGameMetadata } from "@/lib/enrichment/game-metadata";
import {
  getSteamGlobalAchievementData,
  getSteamStoreMetadata,
  searchSteamStoreGame,
} from "@/lib/steam/api";
import {
  ensureSteamGame,
  findSteamGameByAppId,
} from "@/lib/sources/steam-source";
import {
  insertRows,
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/supabase/rest";
import type { GameRow, ProfileRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

export type BrowserImportSource =
  | "instant_gaming"
  | "retroachievements"
  | "steam_family";

export type BrowserImportGame = {
  achievementTotal?: number;
  externalId?: string;
  imageUrl?: string;
  name?: string;
  steamAppId?: number;
};

type ExternalIdRow = {
  game_id: string;
};

function normalizeImportedGameName(
  source: BrowserImportSource,
  name?: string,
) {
  if (!name || source !== "instant_gaming") {
    return name;
  }

  return name
    .replace(/^(?:acheter|buy)\s+/iu, "")
    .replace(
      /\s+(?:[-\u2013\u2014]\s*)?(?:PC|Mac|Linux|Xbox|PlayStation|PS[345]|Nintendo|Switch)\b.*$/iu,
      "",
    )
    .replace(
      /\s*\((?:Steam|Epic Games|GOG|Microsoft Store|Rockstar|Ubisoft Connect)\)\s*$/iu,
      "",
    )
    .trim();
}

async function ensureExternalGame(
  source: "retroachievements",
  externalId: string,
  name: string,
  imageUrl?: string,
) {
  const existing = await selectRows<ExternalIdRow>("game_external_ids", {
    source: `eq.${source}`,
    external_id: `eq.${externalId}`,
    select: "game_id",
    limit: 1,
  });

  if (existing[0]) {
    const games = await selectRows<GameRow>("games", {
      id: `eq.${existing[0].game_id}`,
      select: "*",
      limit: 1,
    });

    return games[0];
  }

  const created = await insertRows<GameRow>("games", [
    {
      name,
      cover_url: imageUrl ?? null,
      header_url: imageUrl ?? null,
      metadata: {},
    },
  ]);

  await insertRows("game_external_ids", [
    {
      external_id: externalId,
      game_id: created[0].id,
      source,
    },
  ]);

  return created[0];
}

async function hasLibraryEntry(
  profileId: string,
  gameId: string,
  source: "retroachievements" | "steam" | "steam_wishlist",
) {
  const rows = await selectRows<{ id: string }>("user_library_entries", {
    profile_id: `eq.${profileId}`,
    game_id: `eq.${gameId}`,
    source: `eq.${source}`,
    select: "id",
    limit: 1,
  });

  return Boolean(rows[0]);
}

async function hasAnyLibraryEntry(profileId: string, gameId: string) {
  const rows = await selectRows<{ id: string }>("user_library_entries", {
    profile_id: `eq.${profileId}`,
    game_id: `eq.${gameId}`,
    select: "id",
    limit: 1,
  });

  return Boolean(rows[0]);
}

async function importSteamMappedGame(
  profileId: string,
  source: BrowserImportSource,
  input: BrowserImportGame,
) {
  const importedName = normalizeImportedGameName(source, input.name);
  const matched =
    input.steamAppId != null
      ? { id: input.steamAppId, name: importedName ?? "" }
      : importedName
        ? await searchSteamStoreGame(importedName)
        : null;

  if (!matched) {
    return "unmatched" as const;
  }

  const existingGame = await findSteamGameByAppId(String(matched.id));

  if (
    existingGame &&
    await hasAnyLibraryEntry(profileId, existingGame.id)
  ) {
    return "duplicate" as const;
  }

  const [store, achievements] = await Promise.all([
    existingGame ? null : getSteamStoreMetadata(matched.id),
    getSteamGlobalAchievementData(matched.id),
  ]);

  const gameName = existingGame?.name ?? store?.name;

  if (!gameName) {
    return "unmatched" as const;
  }

  const game =
    existingGame ??
    await ensureSteamGame({
      appid: String(matched.id),
      name: gameName,
      coverUrl: input.imageUrl ?? null,
      headerUrl:
        store?.headerUrl ??
        `https://cdn.akamai.steamstatic.com/steam/apps/${matched.id}/header.jpg`,
    });
  const librarySource =
    source === "steam_family" ? "steam" : "steam_wishlist";

  if (await hasLibraryEntry(profileId, game.id, librarySource)) {
    return "duplicate" as const;
  }

  const currentMetadata = game.metadata as GameMetadata;
  let metadata = currentMetadata;

  if (
    achievements &&
    (
      !currentMetadata.duration_category ||
      !currentMetadata.difficulty_category ||
      !currentMetadata.challenge_tier
    )
  ) {
    metadata = await enrichGameMetadata(
      gameName,
      currentMetadata,
      achievements.difficultyScore,
    );

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
        game_id: game.id,
        profile_id: profileId,
        source: librarySource,
        raw_data: {
          achievement_total: achievements?.achievementTotal ?? 0,
          achievement_unlocked: 0,
          achievements_completed: false,
          catalog_origin: source,
          has_community_visible_stats:
            (achievements?.achievementTotal ?? 0) > 0,
        },
      },
    ],
    "profile_id,game_id,source",
  );

  return "imported" as const;
}

async function importRetroAchievementsGame(
  profileId: string,
  input: BrowserImportGame,
) {
  if (!input.externalId || !input.name) {
    return "unmatched" as const;
  }

  const game = await ensureExternalGame(
    "retroachievements",
    input.externalId,
    input.name,
    input.imageUrl,
  );

  if (await hasLibraryEntry(profileId, game.id, "retroachievements")) {
    return "duplicate" as const;
  }

  await upsertRows(
    "user_library_entries",
    [
      {
        game_id: game.id,
        profile_id: profileId,
        source: "retroachievements",
        raw_data: {
          achievement_total: Math.max(input.achievementTotal ?? 1, 1),
          achievement_unlocked: 0,
          achievements_completed: false,
          has_community_visible_stats: true,
          progress_requires_sync: true,
        },
      },
    ],
    "profile_id,game_id,source",
  );

  return "imported" as const;
}

export async function importBrowserGames(
  profileId: string,
  source: BrowserImportSource,
  games: BrowserImportGame[],
) {
  const profile = await selectRows<ProfileRow>("profiles", {
    id: `eq.${profileId}`,
    select: "*",
    limit: 1,
  });

  if (!profile[0]) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const totals = { duplicate: 0, imported: 0, unmatched: 0 };
  const unmatchedGames: {
    normalizedName?: string;
    receivedName?: string;
  }[] = [];

  for (const game of games.slice(0, 500)) {
    const result =
      source === "retroachievements"
        ? await importRetroAchievementsGame(profileId, game)
        : await importSteamMappedGame(profileId, source, game);
    totals[result] += 1;

    if (result === "unmatched") {
      unmatchedGames.push({
        normalizedName: normalizeImportedGameName(source, game.name),
        receivedName: game.name,
      });
    }
  }

  return {
    ...totals,
    unmatchedGames,
  };
}
