import Image from "next/image";
import Link from "next/link";
import {
  completedGameSourceLabel,
  formatPoints,
} from "@/lib/ranking/scoring";
import type { UserLeaderboardEntry } from "@/lib/ranking/queries";

export function LeaderboardTable({
  entries,
}: {
  entries: UserLeaderboardEntry[];
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-xl font-black text-stone-950">Leaderboard</h2>
        <p className="mt-1 text-sm text-stone-600">
          Les chasseurs de succes classes par total de points.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="border-y border-stone-200 py-6 text-sm font-semibold text-stone-500">
          Aucun jeu termine a 100 % pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto border-y border-stone-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-500">
                <th className="px-4 py-3">Rang</th>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">Jeux termines</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3">Meilleurs jeux</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const profileUrl =
                  entry.profile.profile_url ??
                  `https://steamcommunity.com/profiles/${entry.profile.steam_id}`;

                return (
                  <tr
                    className="border-b border-stone-100 align-top last:border-b-0"
                    key={entry.profile.id}
                  >
                    <td className="px-4 py-4 text-lg font-black text-stone-950">
                      #{entry.rank}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex items-center gap-3 font-bold text-stone-950 hover:text-emerald-700"
                        href={profileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {entry.profile.avatar_url ? (
                          <Image
                            alt=""
                            className="h-10 w-10 rounded-md object-cover"
                            height={40}
                            src={entry.profile.avatar_url}
                            width={40}
                          />
                        ) : (
                          <span className="h-10 w-10 rounded-md bg-stone-200" />
                        )}
                        {entry.profile.display_name ?? entry.profile.steam_id}
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-700">
                      {entry.completedCount}
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-black text-emerald-700">
                      {formatPoints(entry.totalPoints)}
                    </td>
                    <td className="px-4 py-4">
                      <details>
                        <summary className="cursor-pointer text-sm font-bold text-emerald-700">
                          Afficher le top 3
                        </summary>
                        <ol className="mt-3 grid gap-2">
                          {entry.topGames.map((game) => (
                            <li
                              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2"
                              key={game.gameId}
                            >
                              {game.headerUrl ? (
                                <Image
                                  alt=""
                                  className="h-9 w-9 rounded object-cover"
                                  height={36}
                                  src={game.headerUrl}
                                  width={36}
                                />
                              ) : (
                                <span className="h-9 w-9 rounded bg-stone-200" />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-stone-900">
                                  {game.name}
                                </span>
                                <span className="block text-xs text-stone-500">
                                  {completedGameSourceLabel(
                                    game.source,
                                    game.catalogOrigin,
                                  )}
                                </span>
                              </span>
                              <strong className="text-sm text-emerald-700">
                                {formatPoints(game.points)} pts
                              </strong>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
