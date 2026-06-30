"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DifficultyLevel, WheelSelectionStrategy } from "@/types/backlog";

const difficulties: { value: DifficultyLevel; label: string; hint: string }[] = [
  { value: "hard", label: "Hard", hint: "3 jeux tires automatiquement" },
  { value: "medium", label: "Medium", hint: "5 jeux + 1 free slot manuel" },
  { value: "easy", label: "Easy", hint: "7 jeux + 2 free slots manuels" },
];
const strategies: {
  value: WheelSelectionStrategy;
  label: string;
  hint: string;
}[] = [
  { value: "random", label: "Hasard", hint: "Applique seulement les quotas" },
  { value: "difficulty", label: "Difficulte", hint: "Priorise les jeux faciles" },
  { value: "duration", label: "Duree", hint: "Priorise les jeux courts" },
  { value: "balanced", label: "Les deux", hint: "Score moyen duree + difficulte" },
];

export function WheelSetup() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectionStrategy, setSelectionStrategy] =
    useState<WheelSelectionStrategy>("random");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function createWheel() {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/wheel/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          autoPick: mode === "new",
          difficulty,
          selectionStrategy,
        },
      ),
    });
    const payload = (await response.json()) as {
      error?: string;
      picked?: unknown[];
    };

    setPending(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Creation impossible.");
      return;
    }

    setMessage(
      mode === "existing"
        ? "Roue creee vide. Tu peux la composer manuellement."
        : `${payload.picked?.length ?? 0} jeux ajoutes a la roue.`,
    );
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
        Configuration
      </p>
      <h2 className="mt-2 text-2xl font-black text-stone-950">
        Choisis ta roue
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        Une nouvelle roue remplit automatiquement les slots normaux. Une roue
        existante correspond a une selection faite ailleurs : l&apos;app cree une
        roue vide pour que tu la composes manuellement.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          className={
            "min-h-11 rounded-md border px-3 text-sm font-bold transition " +
            (mode === "new"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-stone-300 bg-white text-stone-700 hover:border-emerald-700")
          }
          onClick={() => setMode("new")}
          type="button"
        >
          Nouvelle roue
        </button>
        <button
          className={
            "min-h-11 rounded-md border px-3 text-sm font-bold transition " +
            (mode === "existing"
              ? "border-amber-600 bg-amber-50 text-amber-900"
              : "border-stone-300 bg-white text-stone-700 hover:border-amber-600")
          }
          onClick={() => setMode("existing")}
          type="button"
        >
          Roue existante
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {difficulties.map((item) => (
          <button
            className={
              "rounded-md border p-3 text-left transition " +
              (difficulty === item.value
                ? "border-emerald-700 bg-emerald-50"
                : "border-stone-300 bg-white hover:border-emerald-700")
            }
            key={item.value}
            onClick={() => setDifficulty(item.value)}
            type="button"
          >
            <span className="block text-sm font-bold text-stone-950">
              {item.label}
            </span>
            <span className="mt-1 block text-xs font-medium text-stone-600">
              {mode === "new"
                ? item.hint
                : item.hint.replace("tires automatiquement", "a choisir")}
            </span>
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-stone-700">Tri</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {strategies.map((item) => (
              <button
                className={
                  "rounded-md border p-3 text-left transition " +
                  (selectionStrategy === item.value
                    ? "border-sky-700 bg-sky-50"
                    : "border-stone-300 bg-white hover:border-sky-700")
                }
                key={item.value}
                onClick={() => setSelectionStrategy(item.value)}
                type="button"
              >
                <span className="block text-sm font-bold text-stone-950">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs font-medium text-stone-600">
                  {item.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={pending}
          onClick={createWheel}
          type="button"
        >
          {pending
            ? "Chargement..."
            : mode === "existing"
              ? "Creer une roue vide"
              : "Creer la roue"}
        </button>
        {message ? (
          <p className="text-sm font-semibold text-stone-700">{message}</p>
        ) : null}
      </div>
    </section>
  );
}
