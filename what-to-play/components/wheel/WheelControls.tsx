"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameAutocomplete } from "@/components/wheel/GameAutocomplete";
import type {
  DifficultyLevel,
  SlotType,
  WheelSelectionStrategy,
} from "@/types/backlog";

type Props = {
  initialDifficulty: DifficultyLevel;
  initialStrategy: WheelSelectionStrategy;
  regularAvailable: number;
  freeAvailable: number;
  candidates?: {
    game_id: string;
    playtime_minutes: number;
    games: {
      name: string;
      header_url: string | null;
    };
  }[];
};

type SpinPayload = {
  error?: string;
  selected?: {
    games?: {
      name: string;
      header_url: string | null;
    };
  };
};

const difficulties: { value: DifficultyLevel; label: string; hint: string }[] = [
  { value: "hard", label: "Hard", hint: "3 jeux" },
  { value: "medium", label: "Medium", hint: "5 jeux + 1 free" },
  { value: "easy", label: "Easy", hint: "7 jeux + 2 free" },
];
const strategies: { value: WheelSelectionStrategy; label: string }[] = [
  { value: "random", label: "Hasard" },
  { value: "difficulty", label: "Difficulte" },
  { value: "duration", label: "Duree" },
  { value: "balanced", label: "Les deux" },
];

export function WheelControls({
  initialDifficulty,
  initialStrategy,
  regularAvailable,
  freeAvailable,
  candidates = [],
}: Props) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [selectionStrategy, setSelectionStrategy] = useState(initialStrategy);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedGame, setSelectedGame] = useState<SpinPayload["selected"] | null>(
    null,
  );
  const [manualGameId, setManualGameId] = useState("");

  async function saveConfig(
    nextDifficulty = difficulty,
    nextStrategy = selectionStrategy,
  ) {
    await fetch("/api/wheel/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        difficulty: nextDifficulty,
        selectionStrategy: nextStrategy,
      }),
    });
    router.refresh();
  }

  async function spin() {
    setPending(true);
    setMessage("");
    setSelectedGame(null);
    setRotation((current) => current + 1440 + Math.floor(Math.random() * 720));

    const response = await fetch("/api/wheel/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const payload = (await response.json()) as SpinPayload;

    if (!response.ok) {
      window.setTimeout(() => {
        setPending(false);
      }, 700);
      setMessage(payload.error ?? "Tirage impossible.");
      return;
    }

    window.setTimeout(() => {
      setSelectedGame(payload.selected ?? null);
      setMessage("Jeu ajoute au backlog en cours.");
      setPending(false);
      router.refresh();
    }, 1800);
  }

  async function chooseGame(slotType: SlotType) {
    if (!manualGameId) {
      setMessage("Choisis un jeu dans la liste.");
      return;
    }

    setPending(true);
    setMessage("");

    const response = await fetch("/api/wheel/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: manualGameId, slotType }),
    });
    const payload = (await response.json()) as SpinPayload;

    if (!response.ok) {
      setMessage(payload.error ?? "Selection impossible.");
      setPending(false);
      return;
    }

    setSelectedGame(payload.selected ?? null);
    setMessage("Jeu ajoute au backlog en cours.");
    setPending(false);
    router.refresh();
  }

  async function clearWheel() {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/wheel/current", {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Impossible de supprimer la roue.");
      setPending(false);
      return;
    }

    setSelectedGame(null);
    setMessage("Roue supprimee. Cree une nouvelle roue pour relancer.");
    setPending(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div className="relative mx-auto grid aspect-square w-full max-w-[420px] place-items-center">
        <div
          className="absolute inset-0 rounded-full border-[18px] border-amber-400 shadow-inner transition-transform duration-[1800ms] ease-out"
          style={{
            background:
              "conic-gradient(#064e3b 0 45deg, #f59e0b 45deg 90deg, #0f172a 90deg 135deg, #0284c7 135deg 180deg, #7c2d12 180deg 225deg, #16a34a 225deg 270deg, #4338ca 270deg 315deg, #be123c 315deg 360deg)",
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <div className="absolute -top-1 z-10 h-0 w-0 border-x-[16px] border-t-[30px] border-x-transparent border-t-stone-950" />
        <div className="relative z-10 grid h-48 w-48 place-items-center rounded-full border-4 border-white bg-stone-950 p-4 text-center text-white shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              {pending ? "Tirage" : "Selection"}
            </p>
            <p className="mt-2 line-clamp-4 text-xl font-black leading-tight">
              {pending
                ? "La roue tourne..."
                : selectedGame?.games?.name ?? "Pret a tourner"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-stone-700">Difficulte</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {difficulties.map((item) => (
            <button
              className={
                "rounded-md border p-3 text-left transition " +
                (difficulty === item.value
                  ? "border-emerald-700 bg-emerald-50"
                  : "border-stone-300 bg-white hover:border-emerald-700")
              }
              key={item.value}
              onClick={() => {
                setDifficulty(item.value);
                setSelectedGame(null);
                saveConfig(item.value);
              }}
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

      <div>
        <p className="mb-2 text-sm font-bold text-stone-700">
          Tri des remplacements
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          {strategies.map((item) => (
            <button
              className={
                "min-h-10 rounded-md border px-3 text-sm font-bold transition " +
                (selectionStrategy === item.value
                  ? "border-sky-700 bg-sky-50 text-sky-900"
                  : "border-stone-300 bg-white text-stone-700 hover:border-sky-700")
              }
              key={item.value}
              onClick={() => {
                setSelectionStrategy(item.value);
                saveConfig(difficulty, item.value);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4">
        <div className="grid gap-3">
          <button
            className="min-h-12 rounded-md bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={pending || regularAvailable <= 0}
            onClick={spin}
            type="button"
          >
            Tirer un slot normal ({regularAvailable})
          </button>

          <div className="grid gap-2">
            <span className="text-sm font-bold text-stone-700">
              Choisir exceptionnellement un jeu
            </span>
            <GameAutocomplete
              candidates={candidates}
              disabled={pending || candidates.length === 0}
              key={candidates.length}
              onSelect={setManualGameId}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="min-h-12 rounded-md border border-stone-950 px-4 text-sm font-bold text-stone-950 transition hover:border-emerald-800 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              disabled={pending || regularAvailable <= 0 || candidates.length === 0}
              onClick={() => chooseGame("regular")}
              type="button"
            >
              Choisir en slot normal
            </button>
            <button
              className="min-h-12 rounded-md border border-amber-600 px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              disabled={pending || freeAvailable <= 0 || candidates.length === 0}
              onClick={() => chooseGame("free")}
              type="button"
            >
              Choisir en free slot ({freeAvailable})
            </button>
          </div>

          <button
            className="min-h-11 rounded-md border border-red-300 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={clearWheel}
            type="button"
          >
            Supprimer la roue actuelle
          </button>
        </div>
        {message ? <p className="text-sm font-semibold text-stone-700">{message}</p> : null}
      </div>
    </div>
  );
}
