"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import type { UserGameRow } from "@/types/database";
import type { GameMetadata } from "@/types/game-metadata";

export type CompletionEvent = {
  completed: UserGameRow;
  replacement: UserGameRow | null;
};

type ConfettiStyle = CSSProperties & {
  "--confetti-color": string;
  "--confetti-delay": string;
  "--confetti-drift": string;
  "--confetti-duration": string;
  "--confetti-left": string;
};

const confettiColors = [
  "#059669",
  "#f59e0b",
  "#0284c7",
  "#e11d48",
  "#7c3aed",
  "#f97316",
];

function imageUrl(game: UserGameRow) {
  return game.games?.header_url ?? game.games?.cover_url ?? null;
}

function gameMetadata(game: UserGameRow) {
  return (game.games?.metadata ?? {}) as GameMetadata;
}

export function CompletionCelebration({
  events,
  onClose,
}: {
  events: CompletionEvent[];
  onClose: () => void;
}) {
  const [eventIndex, setEventIndex] = useState(0);
  const [showReplacement, setShowReplacement] = useState(false);
  const event = events[eventIndex];

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!event) {
    return null;
  }

  function continueCelebration() {
    if (eventIndex < events.length - 1) {
      setEventIndex((current) => current + 1);
      setShowReplacement(false);
      return;
    }

    onClose();
  }

  const displayedGame = showReplacement
    ? event.replacement
    : event.completed;
  const displayedImage = displayedGame ? imageUrl(displayedGame) : null;
  const metadata = event.replacement
    ? gameMetadata(event.replacement)
    : null;

  return (
    <div
      aria-labelledby="completion-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-stone-950/75 p-4"
      role="dialog"
    >
      {!showReplacement ? <Confetti /> : null}

      <section className="relative z-10 grid w-full max-w-xl gap-5 overflow-hidden rounded-lg bg-white p-5 shadow-2xl sm:p-7">
        <button
          aria-label="Fermer"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-2xl leading-none text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
          onClick={onClose}
          title="Fermer"
          type="button"
        >
          ×
        </button>

        <div className="pr-10">
          <p className="text-sm font-black uppercase text-emerald-700">
            {showReplacement ? "Prochain objectif" : "100 % terminé"}
          </p>
          <h2
            className="mt-2 text-3xl font-black text-stone-950"
            id="completion-title"
          >
            {showReplacement ? "Votre prochain jeu" : "Félicitations !"}
          </h2>
          <p className="mt-2 text-stone-600">
            {showReplacement
              ? event.replacement
                ? "Voici le prochain jeu à terminer à 100 %."
                : "Aucun remplacement automatique n'est disponible pour ce slot."
              : `Vous avez fini ${event.completed.games?.name ?? "ce jeu"}.`}
          </p>
        </div>

        {displayedGame ? (
          <div className="grid gap-4">
            {displayedImage ? (
              <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-stone-200">
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 90vw, 560px"
                  src={displayedImage}
                />
              </div>
            ) : (
              <div className="aspect-[16/7] rounded-md bg-stone-200" />
            )}
            <div>
              <h3 className="text-2xl font-black text-stone-950">
                {displayedGame.games?.name ?? "Jeu inconnu"}
              </h3>
              {showReplacement && metadata ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase">
                  <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">
                    Difficulté {metadata.difficulty_category ?? "medium"}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-900">
                    Durée {metadata.duration_category ?? "medium"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-5 text-sm font-semibold text-stone-600">
            Le slot est maintenant disponible. Les free slots restent à choisir
            manuellement.
          </div>
        )}

        <button
          className="min-h-11 rounded-md bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800"
          onClick={
            showReplacement
              ? continueCelebration
              : () => setShowReplacement(true)
          }
          type="button"
        >
          {showReplacement
            ? eventIndex < events.length - 1
              ? "Voir la félicitation suivante"
              : "Retour au dashboard"
            : "Voir le prochain jeu"}
        </button>
      </section>
    </div>
  );
}

function Confetti() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 48 }, (_, index) => {
        const style: ConfettiStyle = {
          "--confetti-color":
            confettiColors[index % confettiColors.length],
          "--confetti-delay": `${(index % 12) * -0.18}s`,
          "--confetti-drift": `${((index * 37) % 180) - 90}px`,
          "--confetti-duration": `${2.8 + (index % 7) * 0.18}s`,
          "--confetti-left": `${(index * 29) % 100}%`,
        };

        return (
          <span
            className="completion-confetti"
            key={index}
            style={style}
          />
        );
      })}
    </div>
  );
}
