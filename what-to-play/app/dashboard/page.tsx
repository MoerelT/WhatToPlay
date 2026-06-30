import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CurrentGamesList } from "@/components/dashboard/CurrentGamesList";
import { SyncSteamButton } from "@/components/dashboard/SyncSteamButton";
import {
  getActiveWheel,
  getInProgressGames,
  getLibraryCandidates,
  getSlotState,
} from "@/lib/backlog/queries";
import { requireProfile } from "@/lib/auth/current-user";

type DashboardPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profile = await requireProfile();
  const { error } = await searchParams;
  const wheel = await getActiveWheel(profile.id);
  const [slotState, currentGames, candidates] = wheel
    ? await Promise.all([
        getSlotState(profile.id, wheel),
        getInProgressGames(profile.id, wheel.id),
        getLibraryCandidates(profile.id, "achievements"),
      ])
    : [
        null,
        [],
        await getLibraryCandidates(profile.id, "achievements"),
      ];

  return (
    <AppShell profile={profile}>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8">
        {!profile.is_steam_profile_public || error === "private-profile" ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Ton profil Steam doit etre public pour synchroniser ta bibliotheque.
            Modifie la confidentialite dans Steam, puis reconnecte-toi.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Jeux en cours
            </h1>
            {wheel && slotState ? (
              <p className="mt-2 max-w-2xl text-stone-600">
                Difficulte {wheel.difficulty}. Il reste{" "}
                {slotState.available.regular} slot normal et{" "}
                {slotState.available.free} free slot. Une synchronisation Steam
                retire automatiquement les jeux dont tous les succes sont debloques.
              </p>
            ) : (
              <p className="mt-2 max-w-2xl text-stone-600">
                Aucune roue active. Cree une roue pour remplir automatiquement
                les slots normaux.
              </p>
            )}
          </div>
          <SyncSteamButton />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="En cours" value={String(currentGames.length)} />
          <Metric label="Disponibles" value={String(candidates.length)} />
          <Metric
            label="Slots libres"
            value={
              slotState
                ? String(slotState.available.regular + slotState.available.free)
                : "0"
            }
          />
        </div>

        <CurrentGamesList games={currentGames} />

        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <Link
            className="inline-flex min-h-11 items-center rounded-md bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
            href="/wheel"
          >
              {wheel ? "Ouvrir la roue" : "Configurer la roue"}
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-stone-950">{value}</p>
    </div>
  );
}
