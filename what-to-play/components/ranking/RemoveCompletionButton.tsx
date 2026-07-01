"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveCompletionButton({
  gameId,
  gameName,
}: {
  gameId: string;
  gameName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function removeCompletion() {
    setPending(true);
    setError(false);

    const response = await fetch(`/api/completed-games/${gameId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setPending(false);
      setError(true);
      return;
    }

    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="min-h-8 rounded-md bg-red-700 px-3 text-xs font-bold text-white disabled:bg-stone-300"
          disabled={pending}
          onClick={removeCompletion}
          type="button"
        >
          {pending ? "Retrait..." : "Confirmer"}
        </button>
        <button
          className="min-h-8 rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-700"
          disabled={pending}
          onClick={() => setConfirming(false)}
          type="button"
        >
          Annuler
        </button>
        {error ? (
          <span className="w-full text-right text-xs font-bold text-red-700">
            Retrait impossible.
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      aria-label={`Retirer ${gameName} des jeux termines`}
      className="min-h-8 rounded-md border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
      onClick={() => setConfirming(true)}
      type="button"
    >
      Retirer
    </button>
  );
}
