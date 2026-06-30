import type { GameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

const seriesRules: Array<{ key: string; pattern: RegExp }> = [
  { key: "assassins-creed", pattern: /^assassins creed\b/ },
  { key: "batman-arkham", pattern: /^batman arkham\b/ },
  { key: "battlefield", pattern: /^battlefield\b/ },
  { key: "bloons", pattern: /^bloons\b/ },
  { key: "borderlands", pattern: /^borderlands\b/ },
  { key: "danganronpa", pattern: /^danganronpa\b/ },
  { key: "dark-souls", pattern: /^dark souls\b/ },
  { key: "final-fantasy", pattern: /^final fantasy\b/ },
  { key: "five-nights-at-freddys", pattern: /^five nights at freddys\b/ },
  { key: "half-life", pattern: /^half life\b/ },
  { key: "kingdom-hearts", pattern: /^kingdom hearts\b/ },
  { key: "left-4-dead", pattern: /^left 4 dead\b/ },
  { key: "lego-harry-potter", pattern: /^lego harry potter\b/ },
  { key: "lego-marvel", pattern: /^lego marvel\b/ },
  { key: "lego-star-wars", pattern: /^lego star wars\b/ },
  { key: "little-nightmares", pattern: /^little nightmares\b/ },
  { key: "moss", pattern: /^moss(?: ii)? vr\b/ },
  { key: "outlast", pattern: /^(?:the )?outlast\b|^outlast\b/ },
  { key: "portal", pattern: /^portal\b/ },
  { key: "resident-evil", pattern: /^resident evil\b/ },
  { key: "south-park", pattern: /^south park\b/ },
  { key: "tomb-raider", pattern: /\btomb raider\b/ },
  { key: "trine", pattern: /^trine\b/ },
  { key: "unrailed", pattern: /^unrailed\b/ },
  { key: "xcom", pattern: /^xcom\b/ },
];

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]s\b/g, "s")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function inferGameSeriesKey(gameName: string) {
  const normalized = normalizeTitle(gameName);
  return (
    seriesRules.find((rule) => rule.pattern.test(normalized))?.key ?? null
  );
}

export function inferGameSeriesOrder(gameName: string, seriesKey: string | null) {
  const title = normalizeTitle(gameName);

  if (seriesKey === "batman-arkham") {
    if (title.includes("arkham asylum")) return 1;
    if (title.includes("arkham city")) return 2;
    if (title.includes("arkham origins")) return 3;
    if (title.includes("arkham knight")) return 4;
    if (title.includes("arkham vr")) return 5;
  }

  if (seriesKey === "assassins-creed") {
    if (title.includes("shadows")) return 15;
    if (title.includes("mirage")) return 14;
    if (title.includes("valhalla")) return 13;
    if (title.includes("odyssey")) return 12;
    if (title.includes("origins")) return 11;
    if (title.includes("syndicate")) return 10;
    if (title.includes("unity")) return 9;
    if (title.includes("rogue")) return 8;
    if (title.includes("black flag")) return 7;
    if (title.includes("liberation")) return 6;
    if (/\b(?:iii|3)\b/.test(title)) return 5;
    if (title.includes("revelations")) return 4;
    if (title.includes("brotherhood")) return 3;
    if (/\b(?:ii|2)\b/.test(title)) return 2;
    return 1;
  }

  if (seriesKey === "borderlands") {
    if (title.includes("goty enhanced")) return 1.1;
    if (title.includes("goty")) return 1;
    if (/\bborderlands 2\b/.test(title)) return 2;
    if (title.includes("pre sequel")) return 3;
    if (/\bborderlands 3\b/.test(title)) return 4;
  }

  if (seriesKey === "kingdom-hearts") {
    if (title.includes("1 5 2 5 remix")) return 1;
    if (title.includes("2 8 final chapter")) return 2;
    if (/\bkingdom hearts iii\b/.test(title)) return 3;
  }

  return null;
}

export function getGameSeriesKey(game: GameRow) {
  const metadata = game.metadata as GameMetadata;
  return metadata.series_key ?? inferGameSeriesKey(game.name);
}

function seriesPosition(game: GameRow) {
  const metadata = game.metadata as GameMetadata;
  const seriesKey = getGameSeriesKey(game);
  const order =
    metadata.series_order ?? inferGameSeriesOrder(game.name, seriesKey);
  const timestamp = metadata.released_at
    ? Date.parse(metadata.released_at)
    : Number.NaN;

  return {
    order: order ?? Number.MAX_SAFE_INTEGER,
    releasedAt: Number.isFinite(timestamp)
      ? timestamp
      : Number.MAX_SAFE_INTEGER,
  };
}

function comesBefore(candidate: GameRow, current: GameRow) {
  const candidatePosition = seriesPosition(candidate);
  const currentPosition = seriesPosition(current);

  if (candidatePosition.order !== currentPosition.order) {
    return candidatePosition.order < currentPosition.order;
  }

  if (candidatePosition.releasedAt !== currentPosition.releasedAt) {
    return candidatePosition.releasedAt < currentPosition.releasedAt;
  }

  return candidate.name.localeCompare(current.name) < 0;
}

export function keepFirstAvailableGamePerSeries<
  T extends { games: GameRow },
>(candidates: T[], activeSeriesKeys: Set<string>) {
  const standalone: T[] = [];
  const earliestBySeries = new Map<string, T>();

  for (const candidate of candidates) {
    const seriesKey = getGameSeriesKey(candidate.games);

    if (!seriesKey) {
      standalone.push(candidate);
      continue;
    }

    if (activeSeriesKeys.has(seriesKey)) {
      continue;
    }

    const current = earliestBySeries.get(seriesKey);

    if (!current || comesBefore(candidate.games, current.games)) {
      earliestBySeries.set(seriesKey, candidate);
    }
  }

  return [...standalone, ...earliestBySeries.values()];
}
