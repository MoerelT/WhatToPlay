import { ExcludedGamesList } from "@/components/games/ExcludedGamesList";
import { IncludedGamesList } from "@/components/games/IncludedGamesList";
import { AppShell } from "@/components/layout/AppShell";
import { requireProfile } from "@/lib/auth/current-user";
import {
  getExcludedGames,
  getLibraryCandidates,
} from "@/lib/backlog/queries";

export default async function GamesPage() {
  const profile = await requireProfile();
  const [eligibleGames, includedGames, excludedGames] = await Promise.all([
    getLibraryCandidates(profile.id, "achievements"),
    getLibraryCandidates(profile.id, "achievements", false),
    getExcludedGames(profile.id),
  ]);

  return (
    <AppShell profile={profile}>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Bibliotheque
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
            Jeux
          </h1>
          <p className="mt-3 max-w-2xl text-stone-600">
            Gere les jeux autorises dans tes prochains tirages. La difficulte,
            la duree et la source utilisees par la roue sont visibles ici.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Metric label="Inclus" value={includedGames.length} />
          <Metric label="Exclus" value={excludedGames.length} />
        </div>

        <IncludedGamesList
          candidates={includedGames}
          eligibleGameIds={eligibleGames.map((game) => game.game_id)}
        />
        <ExcludedGamesList games={excludedGames} />
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-4 border-emerald-600 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-950">{value}</p>
    </div>
  );
}
