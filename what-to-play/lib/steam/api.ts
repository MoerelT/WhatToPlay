import { requireEnv } from "@/lib/env";
import type {
  SteamLibraryResponse,
  SteamOwnedGame,
  SteamPlayerSummary,
} from "@/types/steam";

const STEAM_API_BASE = "https://api.steampowered.com";

async function steamFetch<T>(path: string, params: Record<string, string>) {
  const url = new URL(path, STEAM_API_BASE);
  url.searchParams.set("key", requireEnv("STEAM_API_KEY"));
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Steam API failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSteamPlayer(steamId: string) {
  const data = await steamFetch<{ response?: { players?: SteamPlayerSummary[] } }>(
    "/ISteamUser/GetPlayerSummaries/v0002/",
    { steamids: steamId },
  );

  return data.response?.players?.[0] ?? null;
}

export async function getSteamOwnedGames(steamId: string) {
  const data = await steamFetch<SteamLibraryResponse>(
    "/IPlayerService/GetOwnedGames/v0001/",
    {
      steamid: steamId,
      include_appinfo: "true",
      include_played_free_games: "true",
    },
  );

  return data.response?.games ?? [];
}

export async function getSteamWishlist(steamId: string) {
  const data = await steamFetch<{
    response?: {
      items?: {
        appid: number;
        date_added?: number;
        priority?: number;
      }[];
    };
  }>("/IWishlistService/GetWishlist/v1/", {
    steamid: steamId,
  });

  return data.response?.items ?? [];
}

export async function getSteamAchievementSummary(steamId: string, appid: number) {
  try {
    const data = await steamFetch<{
      playerstats?: {
        achievements?: { achieved: number }[];
      };
    }>("/ISteamUserStats/GetPlayerAchievements/v0001/", {
      steamid: steamId,
      appid: String(appid),
    });
    const achievements = data.playerstats?.achievements ?? [];
    const unlocked = achievements.filter((achievement) => achievement.achieved === 1)
      .length;

    return {
      achievement_total: achievements.length,
      achievement_unlocked: unlocked,
      achievements_completed: achievements.length > 0 && unlocked === achievements.length,
    };
  } catch {
    return {
      achievement_total: 0,
      achievement_unlocked: 0,
      achievements_completed: false,
    };
  }
}

export async function getSteamGlobalAchievementData(appid: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const data = await steamFetch<{
        achievementpercentages?: {
          achievements?: { percent?: number | string }[];
        };
      }>("/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/", {
        gameid: String(appid),
      });
      const percentages = (
        data.achievementpercentages?.achievements ?? []
      )
        .map((achievement) => Number(achievement.percent))
        .filter(
          (percent) => Number.isFinite(percent),
        );

      if (percentages.length === 0) {
        return null;
      }

      const sortedPercentages = [...percentages].sort((a, b) => a - b);
      const rareAchievementCount = Math.max(
        3,
        Math.ceil(sortedPercentages.length * 0.25),
      );
      const rareAchievements = sortedPercentages.slice(
        0,
        rareAchievementCount,
      );
      const rareAchievementAverage =
        rareAchievements.reduce((total, percent) => total + percent, 0) /
        rareAchievements.length;

      // Completing a game depends mostly on its rarest achievements, not on
      // the many progression achievements unlocked by most players.
      const score = Math.min(
        10,
        Math.max(1, 10 - rareAchievementAverage / 4),
      );

      return {
        achievementTotal: percentages.length,
        difficultyScore: Math.round(score * 10) / 10,
      };
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        );
      }
    }
  }

  return null;
}

export async function getSteamAchievementDifficultyScore(appid: number) {
  return (await getSteamGlobalAchievementData(appid))?.difficultyScore ?? null;
}

export async function getSteamStoreMetadata(appid: number) {
  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appid));
    url.searchParams.set("l", "english");
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Record<
      string,
      {
        data?: {
          header_image?: string;
          name?: string;
          release_date?: {
            coming_soon?: boolean;
            date?: string;
          };
        };
        success?: boolean;
      }
    >;
    const release = payload[String(appid)]?.data?.release_date;
    const timestamp =
      release?.date && !release.coming_soon
        ? Date.parse(release.date)
        : Number.NaN;

    return {
      headerUrl: payload[String(appid)]?.data?.header_image ?? null,
      name: payload[String(appid)]?.data?.name ?? null,
      releasedAt: Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : null,
    };
  } catch {
    return null;
  }
}

export async function searchSteamStoreGame(gameName: string) {
  try {
    const url = new URL("https://store.steampowered.com/api/storesearch");
    url.searchParams.set("term", gameName);
    url.searchParams.set("l", "english");
    url.searchParams.set("cc", "FR");
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      items?: {
        id: number;
        name: string;
        tiny_image?: string;
        type?: string;
      }[];
    };
    const normalized = gameName
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLowerCase();
    const games = (payload.items ?? []).filter((item) => item.type === "app");

    return (
      games.find(
        (item) =>
          item.name
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim()
            .toLowerCase() === normalized,
      ) ??
      games[0] ??
      null
    );
  } catch {
    return null;
  }
}

export function steamGameImages(appid: number, iconHash?: string) {
  return {
    coverUrl: iconHash
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`
      : null,
    headerUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
  };
}

export function isSteamProfilePublic(player: SteamPlayerSummary | null) {
  return player?.communityvisibilitystate === 3;
}

export type { SteamOwnedGame };
