import Image from "next/image";
import { ExcludeGameButton } from "@/components/dashboard/ExcludeGameButton";
import { GameProgressActions } from "@/components/dashboard/GameProgressActions";
import type { UserGameRow } from "@/types/database";
import type { GameChallengeTier, GameMetadata } from "@/types/game-metadata";

const tierLabels: Record<GameChallengeTier, string> = {
  easy: "Easy",
  hard: "Hard",
  medium: "Medium",
};

function getMetadata(entry: UserGameRow) {
  return (entry.games?.metadata ?? {}) as GameMetadata;
}

function getTier(entry: UserGameRow): GameChallengeTier {
  return getMetadata(entry).challenge_tier ?? "medium";
}

export function CurrentGamesList({ games }: { games: UserGameRow[] }) {
  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-stone-700">
        Aucun jeu en cours pour le moment. Lance la roue pour remplir un slot.
      </div>
    );
  }

  const grouped = {
    easy: games.filter((entry) => getTier(entry) === "easy"),
    medium: games.filter((entry) => getTier(entry) === "medium"),
    hard: games.filter((entry) => getTier(entry) === "hard"),
  } satisfies Record<GameChallengeTier, UserGameRow[]>;

  return (
    <div className="grid gap-5">
      {(["easy", "medium", "hard"] as const).map((tier) => (
        <section className="grid gap-3" key={tier}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-stone-950">
              {tierLabels[tier]}
            </h2>
            <span className="rounded bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">
              {grouped[tier].length}
            </span>
          </div>
          {grouped[tier].length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-4 text-sm font-medium text-stone-600">
              Aucun jeu dans cette categorie.
            </div>
          ) : (
            grouped[tier].map((entry) => <GameCard entry={entry} key={entry.id} />)
          )}
        </section>
      ))}
    </div>
  );
}

function GameCard({ entry }: { entry: UserGameRow }) {
  const metadata = getMetadata(entry);

  return (
        <article
          className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[96px_1fr] sm:items-center"
        >
          {entry.games?.header_url ? (
            <Image
              alt=""
              className="h-20 w-full rounded-md object-cover sm:w-24"
              height={80}
              src={entry.games.header_url}
              width={160}
            />
          ) : (
            <div className="h-20 rounded-md bg-stone-200 sm:w-24" />
          )}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="text-lg font-bold text-stone-950">
                {entry.games?.name ?? "Jeu inconnu"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
                <span className="rounded bg-stone-100 px-2 py-1 text-stone-700">
                  {entry.slot_type === "free" ? "Free slot" : "Slot normal"}
                </span>
                <span className="rounded bg-sky-100 px-2 py-1 text-sky-900">
                  {entry.source === "retroachievements"
                    ? "Succès RetroAchievements"
                    : "Succès Steam"}
                </span>
                <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-900">
                  {metadata.hltb_hours
                    ? `Duree ${metadata.duration_category ?? "medium"} (${metadata.hltb_hours}h)`
                    : "Duree inconnue"}
                </span>
                <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">
                  Difficulte {metadata.difficulty_category ?? "medium"}
                  {metadata.difficulty_score ? ` (${metadata.difficulty_score}/10)` : ""}
                </span>
              </div>
            </div>
            <div className="grid justify-items-end gap-3">
              <p className="text-sm font-semibold text-stone-600">
                {entry.source === "retroachievements"
                  ? "Valide manuellement le jeu lorsque tous les succès RA sont débloqués."
                  : "Se retire automatiquement après synchronisation Steam quand tous les succès sont débloqués."}
              </p>
              {entry.source === "retroachievements" ? (
                <GameProgressActions
                  gameName={entry.games?.name ?? "ce jeu"}
                  userGameId={entry.id}
                />
              ) : null}
              <ExcludeGameButton
                gameName={entry.games?.name ?? "ce jeu"}
                userGameId={entry.id}
              />
            </div>
          </div>
        </article>
  );
}
