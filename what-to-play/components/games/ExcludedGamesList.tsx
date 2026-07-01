"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GameBadges } from "@/components/games/GameBadges";
import type { UserGameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

export function ExcludedGamesList({ games }: { games: UserGameRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);
  const visibleGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return games.filter(
      (game) =>
        !restoredIds.has(game.id) &&
        (game.games?.name ?? "").toLowerCase().includes(normalizedQuery),
    );
  }, [games, query, restoredIds]);

  async function restoreGame(gameId: string) {
    setPendingId(gameId);
    setErrorId(null);
    const response = await fetch(`/api/user-games/${gameId}/restore`, {
      method: "POST",
    });

    if (!response.ok) {
      setPendingId(null);
      setErrorId(gameId);
      return;
    }

    setRestoredIds((current) => new Set(current).add(gameId));
    setPendingId(null);
    router.refresh();
  }

  return (
    <section className="grid gap-3 border-t border-stone-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-950">Jeux exclus</h2>
          <p className="mt-1 text-sm text-stone-600">
            {games.length} jeux retires des tirages.
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

      {visibleGames.length === 0 ? (
        <p className="text-sm font-medium text-stone-500">
          Aucun jeu exclu.
        </p>
      ) : (
        <div className="grid max-h-[42rem] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
          {visibleGames.map((entry) => {
            const metadata = (entry.games?.metadata ?? {}) as GameMetadata;

            return (
              <article
                className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[64px_minmax(0,1fr)_auto]"
                key={entry.id}
              >
                {entry.games?.header_url ? (
                  <Image
                    alt=""
                    className="h-16 w-16 rounded-md object-cover"
                    height={64}
                    src={entry.games.header_url}
                    width={64}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-stone-200" />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-stone-950">
                    {entry.games?.name ?? "Jeu inconnu"}
                  </h3>
                  <GameBadges
                    catalogOrigin={entry.catalog_origin}
                    metadata={metadata}
                    source={entry.source}
                    status="excluded"
                  />
                  {errorId === entry.id ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      Restauration impossible.
                    </p>
                  ) : null}
                </div>
                <button
                  className="col-span-2 min-h-9 rounded-md border border-emerald-700 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:border-stone-300 disabled:text-stone-400 sm:col-span-1"
                  disabled={pendingId === entry.id}
                  onClick={() => restoreGame(entry.id)}
                  type="button"
                >
                  {pendingId === entry.id ? "Inclusion..." : "Inclure"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
