import { DIFFICULTY_RULES, getAvailableSlots } from "@/lib/backlog/slots";
import {
  getGameSeriesKey,
  keepFirstAvailableGamePerSeries,
} from "@/lib/backlog/series";
import { pickRandom } from "@/lib/backlog/wheel";
import {
  deleteRows,
  insertRows,
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/supabase/rest";
import type {
  DifficultyLevel,
  SlotType,
  ValidationType,
  WheelSelectionStrategy,
} from "@/types/backlog";
import type { GameRow, UserGameRow, WheelRow } from "@/types/database";
import type { GameChallengeTier, GameMetadata } from "@/types/game-metadata";
import type { LibrarySource } from "@/lib/sources/types";

type LibraryEntryRow = {
  game_id: string;
  playtime_minutes: number;
  source: LibrarySource;
  raw_data: {
    achievements_completed?: boolean;
    achievement_total?: number;
    achievement_unlocked?: number;
    has_community_visible_stats?: boolean;
  } | null;
  games: GameRow;
};

type ActiveGameRow = {
  game_id: string;
  games: GameRow;
  status: "abandoned" | "in_progress";
};

export type WheelCandidate = {
  game_id: string;
  playtime_minutes: number;
  source: LibrarySource;
  games: GameRow;
};
type WheelCandidateSelection = WheelCandidate & {
  assignedTier: GameChallengeTier;
};

const tiers: GameChallengeTier[] = ["easy", "medium", "hard"];
const strategyPattern =
  /\[strategy:(random|difficulty|duration|balanced)\]/;

function wheelNameForStrategy(strategy: WheelSelectionStrategy) {
  return `Ma roue Steam [strategy:${strategy}]`;
}

export function getWheelSelectionStrategy(wheel: WheelRow) {
  return (
    (wheel.name.match(strategyPattern)?.[1] as
      | WheelSelectionStrategy
      | undefined) ?? "random"
  );
}

function categoryScore(value: unknown) {
  return value === "easy" || value === "short" ? 1 : value === "hard" || value === "long" ? 3 : 2;
}

function strategyScore(candidate: WheelCandidate, strategy: WheelSelectionStrategy) {
  const metadata = candidate.games.metadata as GameMetadata;

  if (strategy === "difficulty") {
    return categoryScore(metadata.difficulty_category);
  }

  if (strategy === "duration") {
    return categoryScore(metadata.duration_category);
  }

  if (strategy === "balanced") {
    return (
      categoryScore(metadata.difficulty_category) +
      categoryScore(metadata.duration_category)
    ) / 2;
  }

  return Math.random();
}

function replacementDistance(
  candidate: WheelCandidate,
  removedGame: GameRow,
  strategy: WheelSelectionStrategy,
) {
  const candidateMetadata = candidate.games.metadata as GameMetadata;
  const removedMetadata = removedGame.metadata as GameMetadata;
  const difficultyDistance = Math.abs(
    categoryScore(candidateMetadata.difficulty_category) -
      categoryScore(removedMetadata.difficulty_category),
  );
  const durationDistance = Math.abs(
    categoryScore(candidateMetadata.duration_category) -
      categoryScore(removedMetadata.duration_category),
  );

  if (strategy === "difficulty") {
    return difficultyDistance;
  }

  if (strategy === "duration") {
    return durationDistance;
  }

  if (strategy === "balanced") {
    return difficultyDistance + durationDistance;
  }

  return 0;
}

function pickReplacementCandidate(
  candidates: WheelCandidate[],
  removedGame: GameRow,
  strategy: WheelSelectionStrategy,
) {
  if (strategy === "random") {
    return pickRandom(candidates);
  }

  const scored = candidates.map((candidate) => ({
    candidate,
    distance: replacementDistance(candidate, removedGame, strategy),
  }));
  const bestDistance = Math.min(...scored.map((item) => item.distance));

  return pickRandom(
    scored
      .filter((item) => item.distance === bestDistance)
      .map((item) => item.candidate),
  );
}

function pickCompletionReplacementCandidate(
  candidates: WheelCandidate[],
  completedGame: GameRow,
  strategy: WheelSelectionStrategy,
) {
  if (strategy === "random") {
    return pickRandom(candidates);
  }

  const completedMetadata = completedGame.metadata as GameMetadata;
  const alternatives = candidates.filter((candidate) => {
    const metadata = candidate.games.metadata as GameMetadata;

    if (strategy === "difficulty") {
      return (
        categoryScore(metadata.difficulty_category) !==
        categoryScore(completedMetadata.difficulty_category)
      );
    }

    if (strategy === "duration") {
      return (
        categoryScore(metadata.duration_category) !==
        categoryScore(completedMetadata.duration_category)
      );
    }

    return (
      categoryScore(metadata.difficulty_category) !==
        categoryScore(completedMetadata.difficulty_category) &&
      categoryScore(metadata.duration_category) !==
        categoryScore(completedMetadata.duration_category)
    );
  });

  return pickRandom(alternatives.length > 0 ? alternatives : candidates);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function relativeTier(index: number, total: number): GameChallengeTier {
  const easyLimit = Math.ceil(total / 3);
  const mediumLimit = Math.ceil((total * 2) / 3);

  if (index < easyLimit) {
    return "easy";
  }

  if (index < mediumLimit) {
    return "medium";
  }

  return "hard";
}

function assignRelativeTiers(
  candidates: WheelCandidate[],
  strategy: WheelSelectionStrategy,
): WheelCandidateSelection[] {
  const classified: WheelCandidateSelection[] = [];
  const unclassified: WheelCandidate[] = [];

  for (const candidate of candidates) {
    const metadata = candidate.games.metadata as GameMetadata;
    const tier = metadata.challenge_tier;
    const hasReliableMetadata =
      metadata.difficulty_source &&
      metadata.difficulty_source !== "fallback" &&
      metadata.duration_category;

    if (hasReliableMetadata && tier && tiers.includes(tier)) {
      classified.push({ ...candidate, assignedTier: tier });
    } else {
      unclassified.push(candidate);
    }
  }

  const scoringStrategy = strategy === "random" ? "balanced" : strategy;
  const ordered = shuffle(unclassified).sort(
    (a, b) =>
      strategyScore(a, scoringStrategy) - strategyScore(b, scoringStrategy),
  );

  return [
    ...classified,
    ...ordered.map((candidate, index) => ({
      ...candidate,
      assignedTier: relativeTier(index, ordered.length),
    })),
  ];
}

function quotaForDifficulty(difficulty: DifficultyLevel) {
  if (difficulty === "hard") {
    return { easy: 1, medium: 1, hard: 1 };
  }

  if (difficulty === "medium") {
    return { easy: 1, medium: 1, hard: 1 };
  }

  return { easy: 2, medium: 2, hard: 2 };
}

function pickFromPool(pool: WheelCandidateSelection[]) {
  if (pool.length === 0) {
    return null;
  }

  return pickRandom(pool);
}

function selectWheelCandidates(
  candidates: WheelCandidate[],
  difficulty: DifficultyLevel,
  strategy: WheelSelectionStrategy,
) {
  const targetCount = DIFFICULTY_RULES[difficulty].regularSlots;
  const available = assignRelativeTiers(candidates, strategy);
  const selected: WheelCandidateSelection[] = [];
  const quota = quotaForDifficulty(difficulty);

  for (const tier of tiers) {
    for (let index = 0; index < quota[tier]; index += 1) {
      const pool = available.filter((candidate) => candidate.assignedTier === tier);
      const picked = pickFromPool(pool);

      if (!picked) {
        break;
      }

      selected.push(picked);
      available.splice(
        available.findIndex((candidate) => candidate.game_id === picked.game_id),
        1,
      );
    }
  }

  while (selected.length < targetCount && available.length > 0) {
    const picked = pickFromPool(available);

    if (!picked) {
      break;
    }

    selected.push(picked);
    available.splice(
      available.findIndex((candidate) => candidate.game_id === picked.game_id),
      1,
    );
  }

  return selected;
}

export async function getActiveWheel(profileId: string) {
  const existing = await selectRows<WheelRow>("wheels", {
    profile_id: `eq.${profileId}`,
    is_active: "eq.true",
    select: "*",
    limit: 1,
  });

  if (existing[0]) {
    if (existing[0].validation === "achievements") {
      return existing[0];
    }

    const updated = await updateRows<WheelRow>(
      "wheels",
      { validation: "achievements" },
      {
        id: `eq.${existing[0].id}`,
        profile_id: `eq.${profileId}`,
      },
    );

    return updated[0];
  }

  return null;
}

export async function createWheel(
  profileId: string,
  difficulty: DifficultyLevel,
  autoPick: boolean,
  strategy: WheelSelectionStrategy = "random",
) {
  const currentWheel = await getActiveWheel(profileId);

  if (currentWheel) {
    throw new Error("WHEEL_ALREADY_EXISTS");
  }

  const created = await insertRows<WheelRow>("wheels", [
    {
      profile_id: profileId,
      name: wheelNameForStrategy(strategy),
      difficulty,
      validation: "achievements",
      is_active: true,
    },
  ]);
  const wheel = created[0];
  const picked: UserGameRow[] = [];

  if (!autoPick) {
    return {
      picked,
      wheel,
    };
  }

  const selectedCandidates = selectWheelCandidates(
    await getLibraryCandidates(profileId, "achievements"),
    difficulty,
    strategy,
  );

  for (const selected of selectedCandidates) {
    picked.push(
      await addGameToWheel(
        profileId,
        "regular",
        wheel,
        selected,
      ),
    );
  }

  return {
    picked,
    wheel,
  };
}

export async function updateActiveWheel(
  profileId: string,
  values: {
    difficulty: DifficultyLevel;
    selectionStrategy?: WheelSelectionStrategy;
  },
) {
  const wheel = await getActiveWheel(profileId);

  if (!wheel) {
    throw new Error("NO_ACTIVE_WHEEL");
  }

  const rows = await updateRows<WheelRow>(
    "wheels",
    {
      difficulty: values.difficulty,
      name: values.selectionStrategy
        ? wheelNameForStrategy(values.selectionStrategy)
        : wheel.name,
      validation: "achievements",
    },
    {
      id: `eq.${wheel.id}`,
      profile_id: `eq.${profileId}`,
    },
  );

  return rows[0];
}

export async function getInProgressGames(profileId: string, wheelId?: string) {
  const current = await selectRows<UserGameRow>("user_games", {
    profile_id: `eq.${profileId}`,
    wheel_id: wheelId ? `eq.${wheelId}` : undefined,
    status: "eq.in_progress",
    select: "*,games(*)",
    order: "started_at.desc",
  });

  if (current.length === 0) {
    return current;
  }

  const libraryEntries = await selectRows<{
    game_id: string;
    source: LibrarySource;
  }>("user_library_entries", {
    profile_id: `eq.${profileId}`,
    game_id: `in.(${current.map((entry) => entry.game_id).join(",")})`,
    select: "game_id,source",
  });
  const sourcePriority: Record<LibrarySource, number> = {
    steam: 3,
    steam_wishlist: 2,
    retroachievements: 1,
  };
  const sourcesByGame = new Map<string, LibrarySource>();

  for (const entry of libraryEntries) {
    const existing = sourcesByGame.get(entry.game_id);

    if (!existing || sourcePriority[entry.source] > sourcePriority[existing]) {
      sourcesByGame.set(entry.game_id, entry.source);
    }
  }

  return current.map((entry) => ({
    ...entry,
    source: sourcesByGame.get(entry.game_id),
  }));
}

export async function getSlotState(profileId: string, wheel: WheelRow) {
  const current = await getInProgressGames(profileId, wheel.id);
  const counts = current.reduce<Record<SlotType, number>>(
    (acc, row) => {
      acc[row.slot_type] += 1;
      return acc;
    },
    { regular: 0, free: 0 },
  );

  return {
    counts,
    available: getAvailableSlots(wheel.difficulty, counts),
    current,
  };
}

export async function getLibraryCandidates(
  profileId: string,
  validation: ValidationType = "achievements",
  applySeriesRules = true,
) : Promise<WheelCandidate[]> {
  const library = await selectRows<LibraryEntryRow>("user_library_entries", {
    profile_id: `eq.${profileId}`,
    source: "in.(steam,steam_wishlist,retroachievements)",
    select: "game_id,source,playtime_minutes,raw_data,games(*)",
  });
  const active = await selectRows<ActiveGameRow>("user_games", {
    profile_id: `eq.${profileId}`,
    status: "in.(in_progress,abandoned)",
    select: "game_id,status,games(*)",
  });
  const activeIds = new Set(
    active
      .filter((entry) => entry.status === "in_progress")
      .map((entry) => entry.game_id),
  );
  const excludedIds = new Set(
    active
      .filter((entry) => entry.status === "abandoned")
      .map((entry) => entry.game_id),
  );
  const activeSeriesKeys = new Set(
    active
      .filter((entry) => entry.status === "in_progress")
      .map((entry) => getGameSeriesKey(entry.games))
      .filter((seriesKey): seriesKey is string => Boolean(seriesKey)),
  );

  const sourcePriority: Record<LibrarySource, number> = {
    steam: 3,
    steam_wishlist: 2,
    retroachievements: 1,
  };
  const preferredByGame = new Map<string, LibraryEntryRow>();

  for (const entry of library) {
    const current = preferredByGame.get(entry.game_id);

    if (
      !current ||
      sourcePriority[entry.source] > sourcePriority[current.source]
    ) {
      preferredByGame.set(entry.game_id, entry);
    }
  }

  const candidates = [...preferredByGame.values()]
    .filter((entry) => !activeIds.has(entry.game_id))
    .filter((entry) => !excludedIds.has(entry.game_id))
    .filter((entry) => {
      const total = entry.raw_data?.achievement_total ?? 0;
      const unlocked = entry.raw_data?.achievement_unlocked ?? 0;

      return (
        validation === "achievements" &&
        entry.raw_data?.has_community_visible_stats === true &&
        total > 0 &&
        unlocked < total &&
        entry.raw_data?.achievements_completed !== true
      );
    })
    .map((entry) => ({
      game_id: entry.game_id,
      playtime_minutes: entry.playtime_minutes,
      source: entry.source,
      games: entry.games,
    }));

  return applySeriesRules
    ? keepFirstAvailableGamePerSeries(candidates, activeSeriesKeys)
    : candidates;
}

async function addGameToWheel(
  profileId: string,
  slotType: SlotType,
  wheel: WheelRow,
  candidate: WheelCandidate | WheelCandidateSelection,
) {
  const assignedTier =
    "assignedTier" in candidate
      ? candidate.assignedTier
      : ((candidate.games.metadata as GameMetadata).challenge_tier ?? "medium");
  const metadata = {
    ...candidate.games.metadata,
    challenge_tier: assignedTier,
  };

  await updateRows<GameRow>(
    "games",
    { metadata },
    { id: `eq.${candidate.game_id}` },
  );

  const rows = await insertRows<UserGameRow>("user_games", [
    {
      profile_id: profileId,
      game_id: candidate.game_id,
      wheel_id: wheel.id,
      status: "in_progress",
      slot_type: slotType,
      validation: "achievements",
    },
  ]);

  return {
    ...rows[0],
    games: {
      ...candidate.games,
      metadata,
    },
  };
}

export async function spinWheel(profileId: string) {
  const wheel = await getActiveWheel(profileId);

  if (!wheel) {
    throw new Error("NO_ACTIVE_WHEEL");
  }

  const slotState = await getSlotState(profileId, wheel);

  if (slotState.available.regular <= 0) {
    throw new Error("NO_SLOT_AVAILABLE");
  }

  const candidates = await getLibraryCandidates(profileId, wheel.validation);
  const selected = pickRandom(candidates);

  if (!selected) {
    throw new Error("NO_LIBRARY_CANDIDATE");
  }

  return {
    wheel,
    selected: await addGameToWheel(
      profileId,
      "regular",
      wheel,
      {
        ...selected,
        assignedTier:
          ((selected.games.metadata as GameMetadata).challenge_tier ?? "medium"),
      },
    ),
  };
}

export async function selectWheelGame(
  profileId: string,
  gameId: string,
  slotType: SlotType,
) {
  const wheel = await getActiveWheel(profileId);

  if (!wheel) {
    throw new Error("NO_ACTIVE_WHEEL");
  }

  const slotState = await getSlotState(profileId, wheel);

  if (slotState.available[slotType] <= 0) {
    throw new Error("NO_SLOT_AVAILABLE");
  }

  const candidates = await getLibraryCandidates(profileId, wheel.validation);
  const selected = candidates.find((candidate) => candidate.game_id === gameId);

  if (!selected) {
    throw new Error("NO_LIBRARY_CANDIDATE");
  }

  return {
    wheel,
    selected: await addGameToWheel(
      profileId,
      slotType,
      wheel,
      {
        ...selected,
        assignedTier:
          ((selected.games.metadata as GameMetadata).challenge_tier ?? "medium"),
      },
    ),
  };
}

export async function excludeUserGame(
  profileId: string,
  userGameId: string,
) {
  const rows = await selectRows<{
    game_id: string;
    games: GameRow;
    id: string;
    slot_type: SlotType;
    wheel_id: string | null;
  }>("user_games", {
    id: `eq.${userGameId}`,
    profile_id: `eq.${profileId}`,
    status: "eq.in_progress",
    select: "id,game_id,wheel_id,slot_type,games(*)",
    limit: 1,
  });
  const current = rows[0];

  if (!current) {
    return null;
  }

  const updated = await updateRows<UserGameRow>(
    "user_games",
    {
      status: "abandoned",
      wheel_id: null,
      completed_at: new Date().toISOString(),
    },
    {
      id: `eq.${userGameId}`,
      profile_id: `eq.${profileId}`,
      status: "eq.in_progress",
    },
  );

  if (!updated[0]) {
    return null;
  }

  let replacement: UserGameRow | null = null;

  if (current.slot_type === "regular" && current.wheel_id) {
    const wheel = await getActiveWheel(profileId);

    if (wheel?.id === current.wheel_id) {
      const candidates = await getLibraryCandidates(
        profileId,
        "achievements",
      );
      const selected = pickReplacementCandidate(
        candidates,
        current.games,
        getWheelSelectionStrategy(wheel),
      );

      if (selected) {
        replacement = await addGameToWheel(
          profileId,
          "regular",
          wheel,
          selected,
        );
      }
    }
  }

  return {
    excluded: updated[0],
    replacement,
  };
}

export async function getExcludedGames(profileId: string) {
  return selectRows<UserGameRow>("user_games", {
    profile_id: `eq.${profileId}`,
    status: "eq.abandoned",
    select: "*,games(*)",
    order: "updated_at.desc",
  });
}

export async function excludeLibraryGame(
  profileId: string,
  gameId: string,
) {
  const candidates = await getLibraryCandidates(
    profileId,
    "achievements",
    false,
  );
  const candidate = candidates.find((entry) => entry.game_id === gameId);

  if (!candidate) {
    return null;
  }

  const existing = await selectRows<UserGameRow>("user_games", {
    profile_id: `eq.${profileId}`,
    game_id: `eq.${gameId}`,
    status: "eq.abandoned",
    select: "*",
    limit: 1,
  });

  if (existing[0]) {
    return existing[0];
  }

  const excluded = await insertRows<UserGameRow>("user_games", [
    {
      profile_id: profileId,
      game_id: gameId,
      wheel_id: null,
      status: "abandoned",
      slot_type: "regular",
      validation: "achievements",
      completed_at: new Date().toISOString(),
      notes: "Excluded before wheel creation",
    },
  ]);

  return excluded[0] ?? null;
}

export async function restoreExcludedGame(
  profileId: string,
  userGameId: string,
) {
  const restored = await updateRows<UserGameRow>(
    "user_games",
    {
      status: "available",
      completed_at: null,
    },
    {
      id: `eq.${userGameId}`,
      profile_id: `eq.${profileId}`,
      status: "eq.abandoned",
    },
  );

  return restored[0] ?? null;
}

export async function clearActiveWheel(profileId: string) {
  const wheel = await getActiveWheel(profileId);

  if (!wheel) {
    return null;
  }

  await deleteRows("user_games", {
    profile_id: `eq.${profileId}`,
    wheel_id: `eq.${wheel.id}`,
  });

  await deleteRows("wheels", {
      id: `eq.${wheel.id}`,
      profile_id: `eq.${profileId}`,
  });

  return null;
}

export type AchievementCompletionEvent = {
  completed: UserGameRow & { games: GameRow };
  replacement: UserGameRow | null;
};

async function completeActiveGame(
  profileId: string,
  activeGame: UserGameRow & { games: GameRow },
  wheel: WheelRow | null,
) {
  const now = new Date().toISOString();
  const updated = await updateRows<UserGameRow>(
    "user_games",
    {
      status: "achievements_completed",
      achievements_completed_at: now,
      completed_at: now,
    },
    {
      id: `eq.${activeGame.id}`,
      profile_id: `eq.${profileId}`,
      status: "eq.in_progress",
    },
  );

  if (!updated[0]) {
    return null;
  }

  let replacement: UserGameRow | null = null;

  if (
    activeGame.slot_type === "regular" &&
    wheel &&
    activeGame.wheel_id === wheel.id
  ) {
    const candidates = await getLibraryCandidates(
      profileId,
      "achievements",
    );
    const selected = pickCompletionReplacementCandidate(
      candidates,
      activeGame.games,
      getWheelSelectionStrategy(wheel),
    );

    if (selected) {
      replacement = await addGameToWheel(
        profileId,
        "regular",
        wheel,
        selected,
      );
    }
  }

  return {
    completed: {
      ...updated[0],
      games: activeGame.games,
    },
    replacement,
  } satisfies AchievementCompletionEvent;
}

export async function completeRetroAchievementsGame(
  profileId: string,
  userGameId: string,
) {
  const activeGames = await selectRows<
    UserGameRow & { games: GameRow }
  >("user_games", {
    id: `eq.${userGameId}`,
    profile_id: `eq.${profileId}`,
    status: "eq.in_progress",
    validation: "eq.achievements",
    select: "*,games(*)",
    limit: 1,
  });
  const activeGame = activeGames[0];

  if (!activeGame) {
    return null;
  }

  const libraryEntries = await selectRows<{
    raw_data: {
      achievement_total?: number;
      achievement_unlocked?: number;
      achievements_completed?: boolean;
    };
  }>("user_library_entries", {
    profile_id: `eq.${profileId}`,
    game_id: `eq.${activeGame.game_id}`,
    source: "eq.retroachievements",
    select: "raw_data",
    limit: 1,
  });
  const libraryEntry = libraryEntries[0];

  if (!libraryEntry) {
    return null;
  }

  await updateRows(
    "user_library_entries",
    {
      raw_data: {
        ...libraryEntry.raw_data,
        achievement_unlocked:
          libraryEntry.raw_data.achievement_total ?? 1,
        achievements_completed: true,
      },
    },
    {
      profile_id: `eq.${profileId}`,
      game_id: `eq.${activeGame.game_id}`,
      source: "eq.retroachievements",
    },
  );

  return completeActiveGame(
    profileId,
    activeGame,
    await getActiveWheel(profileId),
  );
}

export async function completeAchievementFinishedGames(profileId: string) {
  const libraryEntries = await selectRows<{
    game_id: string;
    raw_data: { achievements_completed?: boolean } | null;
  }>(
    "user_library_entries",
    {
      profile_id: `eq.${profileId}`,
      source: "eq.steam",
      select: "game_id,raw_data",
    },
  );
  const completedLibraryEntries = libraryEntries.filter(
    (entry) => entry.raw_data?.achievements_completed === true,
  );

  if (completedLibraryEntries.length === 0) {
    return {
      count: 0,
      events: [] as AchievementCompletionEvent[],
    };
  }

  const gameIds = completedLibraryEntries.map((entry) => entry.game_id);
  const activeGames = await selectRows<
    UserGameRow & { games: GameRow }
  >("user_games", {
    profile_id: `eq.${profileId}`,
    status: "eq.in_progress",
    validation: "eq.achievements",
    game_id: `in.(${gameIds.join(",")})`,
    select: "*,games(*)",
    order: "started_at.asc",
  });

  if (activeGames.length === 0) {
    return {
      count: 0,
      events: [] as AchievementCompletionEvent[],
    };
  }

  const wheel = await getActiveWheel(profileId);
  const events: AchievementCompletionEvent[] = [];

  for (const activeGame of activeGames) {
    const event = await completeActiveGame(profileId, activeGame, wheel);

    if (event) {
      events.push(event);
    }
  }

  return {
    count: events.length,
    events,
  };
}

export async function touchLibraryEntry(
  profileId: string,
  gameId: string,
  source = "steam",
) {
  await upsertRows(
    "user_library_entries",
    [
      {
        profile_id: profileId,
        game_id: gameId,
        source,
      },
    ],
    "profile_id,game_id,source",
  );
}
