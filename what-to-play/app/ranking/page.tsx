import { AppShell } from "@/components/layout/AppShell";
import { CompletedGamesTable } from "@/components/ranking/CompletedGamesTable";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";
import { requireProfile } from "@/lib/auth/current-user";
import { getRankingData } from "@/lib/ranking/queries";
import { formatPoints } from "@/lib/ranking/scoring";

export default async function RankingPage() {
  const profile = await requireProfile();
  const { currentGames, leaderboard } = await getRankingData(profile.id);
  const currentEntry = leaderboard.find(
    (entry) => entry.profile.id === profile.id,
  );

  return (
    <AppShell profile={profile}>
      <section className="mx-auto grid w-full max-w-7xl gap-7 px-5 py-6 sm:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Classement
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
            Chasseurs de succes
          </h1>
          <p className="mt-3 max-w-2xl text-stone-600">
            Chaque jeu rapporte sa difficulte multipliee par sa duree : courte
            x1, medium x2 et longue x3.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:max-w-2xl">
          <Metric
            label="Ton rang"
            value={currentEntry ? `#${currentEntry.rank}` : "-"}
          />
          <Metric
            label="Tes points"
            value={formatPoints(currentEntry?.totalPoints ?? 0)}
          />
          <Metric label="Jeux finis" value={String(currentGames.length)} />
        </div>

        <LeaderboardTable entries={leaderboard} />
        <CompletedGamesTable games={currentGames} />
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-emerald-600 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-950">{value}</p>
    </div>
  );
}
