import { AppShell } from "@/components/layout/AppShell";
import { ExtensionConnection } from "@/components/wheel/ExtensionConnection";
import { WheelControls } from "@/components/wheel/WheelControls";
import { WheelSetup } from "@/components/wheel/WheelSetup";
import {
  getActiveWheel,
  getLibraryCandidates,
  getSlotState,
  getWheelSelectionStrategy,
} from "@/lib/backlog/queries";
import { requireProfile } from "@/lib/auth/current-user";

export default async function WheelPage() {
  const profile = await requireProfile();
  const [wheel, candidates] = await Promise.all([
    getActiveWheel(profile.id),
    getLibraryCandidates(profile.id, "achievements"),
  ]);

  if (!wheel) {
    return (
      <AppShell profile={profile}>
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              Roue
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Cree ta prochaine roue
            </h1>
            <p className="mt-3 max-w-xl text-stone-600">
              Choisis une difficulte. Les slots normaux seront tires
              automatiquement, les free slots resteront manuels.
            </p>
          </div>
          <WheelSetup />
          <ExtensionConnection />
        </section>
      </AppShell>
    );
  }

  const slotState = await getSlotState(profile.id, wheel);

  return (
    <AppShell profile={profile}>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Roue
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
            Tire le prochain jeu
          </h1>
          <p className="mt-3 max-w-xl text-stone-600">
            La roue pioche uniquement dans les jeux Steam synchronises qui ne
            sont pas deja en cours, avec des succes Steam detectes et non
            termines. Les free slots se choisissent manuellement.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Metric label="Slots normaux libres" value={slotState.available.regular} />
            <Metric label="Free slots libres" value={slotState.available.free} />
            <Metric label="Jeux candidats" value={candidates.length} />
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-100 p-4">
          <WheelControls
            candidates={candidates}
            freeAvailable={slotState.available.free}
            initialDifficulty={wheel.difficulty}
            initialStrategy={getWheelSelectionStrategy(wheel)}
            regularAvailable={slotState.available.regular}
          />
        </div>
        <div className="lg:col-span-2">
          <ExtensionConnection />
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-stone-950">{value}</p>
    </div>
  );
}
