import Image from "next/image";
import {
  completedGameSourceLabel,
  formatPoints,
} from "@/lib/ranking/scoring";
import type { RankedCompletedGame } from "@/lib/ranking/queries";
import { RemoveCompletionButton } from "@/components/ranking/RemoveCompletionButton";

function categoryLabel(value: string) {
  if (value === "short" || value === "easy") return "Easy";
  if (value === "long" || value === "hard") return "Hard";
  return "Medium";
}

export function CompletedGamesTable({
  games,
}: {
  games: RankedCompletedGame[];
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-xl font-black text-stone-950">
          Tes jeux termines
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Tous les jeux pour lesquels tu as obtenu 100 % des succes.
        </p>
      </div>

      {games.length === 0 ? (
        <p className="border-y border-stone-200 py-6 text-sm font-semibold text-stone-500">
          Aucun jeu termine a 100 %.
        </p>
      ) : (
        <div className="overflow-x-auto border-y border-stone-200 bg-white">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-500">
                <th className="px-4 py-3">Jeu</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Difficulte</th>
                <th className="px-4 py-3">Duree</th>
                <th className="px-4 py-3">Calcul</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr
                  className="border-b border-stone-100 last:border-b-0"
                  key={game.gameId}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {game.headerUrl ? (
                        <Image
                          alt=""
                          className="h-12 w-20 rounded object-cover"
                          height={48}
                          src={game.headerUrl}
                          width={80}
                        />
                      ) : (
                        <span className="h-12 w-20 rounded bg-stone-200" />
                      )}
                      <span className="font-bold text-stone-950">
                        {game.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-stone-600">
                    {completedGameSourceLabel(
                      game.source,
                      game.catalogOrigin,
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-800">
                    {categoryLabel(game.difficultyCategory)} ({game.difficulty}
                    /10)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-800">
                    {categoryLabel(game.durationCategory)}
                    {game.durationHours
                      ? ` (${Math.ceil(game.durationHours)} h)`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-stone-600">
                    {game.difficulty} x {game.multiplier}
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-black text-emerald-700">
                    {formatPoints(game.points)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {game.source === "retroachievements" ? (
                      <RemoveCompletionButton
                        gameId={game.gameId}
                        gameName={game.name}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-stone-400">
                        Automatique
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
