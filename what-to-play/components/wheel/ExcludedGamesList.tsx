"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserGameRow } from "@/types/database";

export function ExcludedGamesList({ games }: { games: UserGameRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);
  const visibleGames = games.filter((game) => !restoredIds.has(game.id));

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
      <div>
        <h2 className="text-xl font-black text-stone-950">Jeux exclus</h2>
        <p className="mt-1 text-sm text-stone-600">
          Ces jeux ne participent plus aux tirages.
        </p>
      </div>

      {visibleGames.length === 0 ? (
        <p className="text-sm font-medium text-stone-500">
          Aucun jeu exclu.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleGames.map((entry) => (
            <article
              className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
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
                <button
                  className="mt-2 min-h-9 rounded-md border border-emerald-700 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:border-stone-300 disabled:text-stone-400"
                  disabled={pendingId === entry.id}
                  onClick={() => restoreGame(entry.id)}
                  type="button"
                >
                  {pendingId === entry.id
                    ? "Restauration..."
                    : "Remettre dans les tirages"}
                </button>
                {errorId === entry.id ? (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    Restauration impossible.
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
