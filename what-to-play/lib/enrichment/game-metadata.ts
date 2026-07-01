import type {
  GameChallengeTier,
  GameDifficultyCategory,
  GameDurationCategory,
  GameMetadata,
} from "@/types/game-metadata";

const REQUEST_TIMEOUT_MS = 3500;
const HLTB_REQUEST_TIMEOUT_MS = 8000;
const HLTB_BASE_URL = "https://howlongtobeat.com";
const HLTB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const STEAM_HUNTERS_BASE_URL = "https://steamhunters.com/api";

type HltbSearchState = {
  endpoint: string;
  expiresAt: number;
  hpKey: string;
  hpVal: string;
  token: string;
};

type HltbSearchResult = {
  comp_100?: number;
  comp_main?: number;
  comp_plus?: number;
  game_name?: string;
};

type SteamHuntersApp = {
  playersPerfectedCount?: number;
  playersStartedCount?: number;
  tags?: { name?: string }[];
};

let hltbSearchStatePromise: Promise<HltbSearchState | null> | null = null;

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WhatToPlay/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function durationCategory(hours: number): GameDurationCategory {
  if (hours < 40) {
    return "short";
  }

  if (hours < 80) {
    return "medium";
  }

  return "long";
}

function normalizeGameName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function difficultyCategory(score: number): GameDifficultyCategory {
  if (score < 4) {
    return "easy";
  }

  if (score < 7) {
    return "medium";
  }

  return "hard";
}

function categoryScore(category: GameDurationCategory | GameDifficultyCategory) {
  return category === "easy" || category === "short"
    ? 1
    : category === "medium"
      ? 2
      : 3;
}

export function challengeTier(
  duration: GameDurationCategory,
  difficulty: GameDifficultyCategory,
): GameChallengeTier {
  const score = (categoryScore(duration) + categoryScore(difficulty)) / 2;

  if (score <= 1.5) {
    return "easy";
  }

  if (score >= 2.5) {
    return "hard";
  }

  return "medium";
}

export function getEffectiveGameMetadata(metadata: GameMetadata): GameMetadata {
  const duration =
    typeof metadata.hltb_hours === "number" && metadata.hltb_hours > 0
      ? durationCategory(metadata.hltb_hours)
      : (metadata.duration_category ?? "medium");
  const difficulty =
    typeof metadata.difficulty_score === "number"
      ? difficultyCategory(metadata.difficulty_score)
      : (metadata.difficulty_category ?? "medium");

  return {
    ...metadata,
    challenge_tier: challengeTier(duration, difficulty),
    difficulty_category: difficulty,
    duration_category: duration,
  };
}

async function discoverHltbEndpoint() {
  try {
    const homepage = await fetch(HLTB_BASE_URL, {
      cache: "no-store",
      headers: { "User-Agent": HLTB_USER_AGENT },
      signal: AbortSignal.timeout(HLTB_REQUEST_TIMEOUT_MS),
    });
    const html = await homepage.text();
    const scripts = Array.from(
      html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
      (match) => match[1],
    ).filter((src) => src.includes("/_next/static/chunks/"));

    for (const src of scripts) {
      const response = await fetch(new URL(src, HLTB_BASE_URL), {
        cache: "no-store",
        headers: { "User-Agent": HLTB_USER_AGENT },
        signal: AbortSignal.timeout(HLTB_REQUEST_TIMEOUT_MS),
      });
      const script = await response.text();
      const match = script.match(/\/api\/([a-zA-Z0-9_-]+)\/init/);

      if (match) {
        return `/api/${match[1]}`;
      }
    }
  } catch {
    return "/api/bleed";
  }

  return "/api/bleed";
}

async function createHltbSearchState(): Promise<HltbSearchState | null> {
  try {
    const endpoint = await discoverHltbEndpoint();
    const initUrl = new URL(`${endpoint}/init`, HLTB_BASE_URL);
    initUrl.searchParams.set("t", String(Date.now()));
    const response = await fetch(initUrl, {
      cache: "no-store",
      headers: {
        Referer: `${HLTB_BASE_URL}/`,
        "User-Agent": HLTB_USER_AGENT,
      },
      signal: AbortSignal.timeout(HLTB_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const token = typeof data.token === "string" ? data.token : null;
    const hpKey = Object.entries(data).find(([key]) =>
      key.toLowerCase().includes("key"),
    )?.[1];
    const hpVal = Object.entries(data).find(([key]) =>
      key.toLowerCase().includes("val"),
    )?.[1];

    if (
      !token ||
      typeof hpKey !== "string" ||
      typeof hpVal !== "string"
    ) {
      return null;
    }

    return {
      endpoint,
      expiresAt: Date.now() + 4 * 60 * 1000,
      hpKey,
      hpVal,
      token,
    };
  } catch {
    return null;
  }
}

async function getHltbSearchState() {
  if (hltbSearchStatePromise) {
    const current = await hltbSearchStatePromise;

    if (current && current.expiresAt > Date.now()) {
      return current;
    }

    hltbSearchStatePromise = null;
  }

  hltbSearchStatePromise = createHltbSearchState();
  return hltbSearchStatePromise;
}

async function searchHowLongToBeat(gameName: string, retry = true) {
  const state = await getHltbSearchState();

  if (!state) {
    return null;
  }

  const payload: Record<string, unknown> = {
    searchType: "games",
    searchTerms: gameName.split(/\s+/),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: 0, max: 0 },
        gameplay: {
          perspective: "",
          flow: "",
          genre: "",
          difficulty: "",
        },
        rangeYear: { max: "", min: "" },
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
    [state.hpKey]: state.hpVal,
  };

  try {
    const response = await fetch(new URL(state.endpoint, HLTB_BASE_URL), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        Origin: HLTB_BASE_URL,
        Referer: `${HLTB_BASE_URL}/`,
        "User-Agent": HLTB_USER_AGENT,
        "x-auth-token": state.token,
        "x-hp-key": state.hpKey,
        "x-hp-val": state.hpVal,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(HLTB_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (retry) {
        hltbSearchStatePromise = null;
        return searchHowLongToBeat(gameName, false);
      }

      return null;
    }

    const data = (await response.json()) as { data?: HltbSearchResult[] };
    return data.data ?? [];
  } catch {
    return null;
  }
}

async function fetchHowLongToBeat(gameName: string) {
  const results = await searchHowLongToBeat(gameName);

  if (!results?.length) {
    return null;
  }

  const normalizedName = normalizeGameName(gameName);
  const match =
    results.find(
      (result) =>
        result.game_name &&
        normalizeGameName(result.game_name) === normalizedName,
    ) ?? results[0];
  const seconds = match.comp_100 || match.comp_plus || match.comp_main || 0;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.ceil(seconds / 3600);
}

async function fetchSteamHuntersDifficulty(appid: string | number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${STEAM_HUNTERS_BASE_URL}/apps/${appid}`, {
      cache: "no-store",
      headers: { "User-Agent": "WhatToPlay/1.0" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const app = (await response.json()) as SteamHuntersApp;
    const started = Number(app.playersStartedCount);
    const perfected = Number(app.playersPerfectedCount);

    if (
      !Number.isFinite(started) ||
      !Number.isFinite(perfected) ||
      started < 50 ||
      perfected < 0
    ) {
      return null;
    }

    const completionRate = Math.max(0.1, (perfected / started) * 100);
    const completionScore = Math.min(
      10,
      Math.max(1, 10 - 4 * Math.log10(completionRate)),
    );
    const isMarkedDifficult = (app.tags ?? []).some(
      (tag) => tag.name?.toLowerCase() === "difficult",
    );
    const score = isMarkedDifficult
      ? Math.max(7, completionScore)
      : completionScore;

    return Math.round(score * 10) / 10;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPsnProfilesDifficulty(gameName: string) {
  const html = await fetchText(
    `https://psnprofiles.com/search/guides?q=${encodeURIComponent(gameName)}`,
  );

  if (!html) {
    return null;
  }

  const match = html.match(/Difficulty[^0-9]{0,80}(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const score = match ? Number(match[1]) : null;

  return score && Number.isFinite(score) ? score : null;
}

async function fetchPsthcDifficulty(gameName: string) {
  const html = await fetchText(
    `https://www.psthc.fr/search?searchword=${encodeURIComponent(gameName)}`,
  );

  if (!html) {
    return null;
  }

  const match = html.match(/Difficult[ée][^0-9]{0,80}(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const score = match ? Number(match[1]) : null;

  return score && Number.isFinite(score) ? score : null;
}

export async function enrichGameMetadata(
  gameName: string,
  currentMetadata: Record<string, unknown>,
  steamDifficultyScore?: number | null,
  steamAppId?: string | number,
): Promise<GameMetadata> {
  const metadata = currentMetadata as GameMetadata;
  let hours = metadata.hltb_hours;
  let duration = metadata.duration_category;
  let hltbSource = metadata.hltb_source;

  if (!hours || !duration) {
    hours = await fetchHowLongToBeat(gameName) ?? undefined;
    duration = hours ? durationCategory(hours) : "medium";
    hltbSource = hours ? "howlongtobeat" : "fallback";
  }

  if (hours) {
    hours = Math.ceil(hours);
    duration = durationCategory(hours);
  }

  let difficultyScore = metadata.difficulty_score;
  let difficulty = metadata.difficulty_category;
  let difficultySource = metadata.difficulty_source;
  const appid = steamAppId ?? metadata.steam_appid;
  const shouldRefreshDifficulty = metadata.difficulty_model_version !== 3;

  if (
    shouldRefreshDifficulty ||
    !difficultyScore ||
    !difficulty ||
    metadata.difficulty_source === "fallback"
  ) {
    const steamHuntersScore = appid
      ? await fetchSteamHuntersDifficulty(appid)
      : null;
    const psnProfilesScore =
      steamHuntersScore == null && steamDifficultyScore == null
        ? await fetchPsnProfilesDifficulty(gameName)
        : null;
    const psthcScore =
      steamHuntersScore == null &&
      steamDifficultyScore == null &&
      psnProfilesScore === null
        ? await fetchPsthcDifficulty(gameName)
        : null;

    difficultyScore =
      steamHuntersScore ??
      steamDifficultyScore ??
      psnProfilesScore ??
      psthcScore ??
      undefined;
    difficulty = difficultyScore ? difficultyCategory(difficultyScore) : "medium";
    difficultySource = steamHuntersScore
      ? "steamhunters"
      : steamDifficultyScore
        ? "steam_achievements"
        : psnProfilesScore
          ? "psnprofiles"
          : psthcScore
            ? "psthc"
            : "fallback";
  }

  return {
    ...metadata,
    challenge_tier: challengeTier(duration, difficulty),
    difficulty_category: difficulty,
    difficulty_model_version:
      difficultySource === "steamhunters" ? 3 : metadata.difficulty_model_version,
    difficulty_score: difficultyScore,
    difficulty_source: difficultySource,
    duration_category: duration,
    hltb_hours: hours,
    hltb_source: hltbSource,
  };
}
