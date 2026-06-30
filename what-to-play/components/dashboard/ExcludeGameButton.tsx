"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExcludeGameButton({
  gameName,
  userGameId,
}: {
  gameName: string;
  userGameId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function excludeGame() {
    setState("loading");
    const response = await fetch(`/api/user-games/${userGameId}/exclude`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setState("error");
      return;
    }

    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-semibold text-red-700">
          Exclure {gameName} des prochains tirages ?
        </span>
        <button
          className="min-h-9 rounded-md bg-red-700 px-3 text-xs font-bold text-white transition hover:bg-red-800 disabled:bg-stone-400"
          disabled={state === "loading"}
          onClick={excludeGame}
          type="button"
        >
          {state === "loading" ? "La roue tourne..." : "Confirmer"}
        </button>
        <button
          className="min-h-9 rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
          disabled={state === "loading"}
          onClick={() => {
            setConfirming(false);
            setState("idle");
          }}
          type="button"
        >
          Annuler
        </button>
        {state === "error" ? (
          <span className="text-xs font-semibold text-red-700">
            Exclusion impossible.
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className="min-h-9 rounded-md border border-red-300 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"
      onClick={() => setConfirming(true)}
      title="Retirer de la roue et exclure des prochains tirages"
      type="button"
    >
      Retirer de la roue
    </button>
  );
}
