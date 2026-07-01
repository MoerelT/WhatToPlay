"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GameBadges } from "@/components/games/GameBadges";
import type { LibrarySource } from "@/lib/sources/types";
import type { GameMetadata } from "@/types/game-metadata";

type Candidate = {
  catalog_origin?: string;
  game_id: string;
  source?: LibrarySource;
  games: {
    header_url: string | null;
    metadata: Record<string, unknown>;
    name: string;
  };
};

export function IncludedGamesList({
  candidates,
  eligibleGameIds,
}: {
  candidates: Candidate[];
  eligibleGameIds: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);
  const eligibleIds = useMemo(
    () => new Set(eligibleGameIds),
    [eligibleGameIds],
  );
  const visibleCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return candidates.filter(
      (candidate) =>
        !excludedIds.has(candidate.game_id) &&
        candidate.games.name.toLowerCase().includes(normalizedQuery),
    );
  }, [candidates, excludedIds, query]);

  async function excludeGame(gameId: string) {
    setPendingId(gameId);
    setErrorId(null);
    const response = await fetch(`/api/library-games/${gameId}/exclude`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setPendingId(null);
      setErrorId(gameId);
      return;
    }

    setExcludedIds((current) => new Set(current).add(gameId));
    setPendingId(null);
    router.refresh();
  }

  return (
    <section className="grid gap-3 border-t border-stone-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-950">
            Jeux inclus
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {candidates.length} jeux detectes, dont {eligibleGameIds.length}{" "}
            actuellement admissibles aux tirages.
          </p>
        </div>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-stone-500">
            Rechercher
          </span>
          <input
            className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom du jeu"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="grid max-h-[42rem] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
        {visibleCandidates.map((candidate) => {
          const metadata = candidate.games.metadata as GameMetadata;
          const isEligible = eligibleIds.has(candidate.game_id);

          return (
            <article
              className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[64px_minmax(0,1fr)_auto]"
              key={candidate.game_id}
            >
              {candidate.games.header_url ? (
                <Image
                  alt=""
                  className="h-16 w-16 rounded-md object-cover"
                  height={64}
                  src={candidate.games.header_url}
                  width={64}
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-stone-200" />
              )}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-stone-950">
                  {candidate.games.name}
                </h3>
                <GameBadges
                  catalogOrigin={candidate.catalog_origin}
                  eligible={isEligible}
                  metadata={metadata}
                  source={candidate.source}
                  status="included"
                />
                {errorId === candidate.game_id ? (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    Exclusion impossible.
                  </p>
                ) : null}
              </div>
              <button
                className="col-span-2 min-h-9 rounded-md border border-red-300 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:border-stone-300 disabled:text-stone-400 sm:col-span-1"
                disabled={pendingId === candidate.game_id}
                onClick={() => excludeGame(candidate.game_id)}
                type="button"
              >
                {pendingId === candidate.game_id ? "Exclusion..." : "Exclure"}
              </button>
            </article>
          );
        })}
      </div>

      {visibleCandidates.length === 0 ? (
        <p className="text-sm font-medium text-stone-500">
          Aucun jeu ne correspond a la recherche.
        </p>
      ) : null}
    </section>
  );
}
