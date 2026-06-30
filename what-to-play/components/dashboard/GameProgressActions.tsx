"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CompletionCelebration,
  type CompletionEvent,
} from "@/components/dashboard/CompletionCelebration";

export function GameProgressActions({
  gameName,
  userGameId,
}: {
  gameName: string;
  userGameId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [completionEvent, setCompletionEvent] =
    useState<CompletionEvent | null>(null);

  async function validate() {
    setPending(true);
    setError("");

    const response = await fetch(`/api/user-games/${userGameId}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation: "achievements" }),
    });
    const payload = (await response.json()) as {
      completionEvent?: CompletionEvent;
      error?: string;
    };

    if (!response.ok || !payload.completionEvent) {
      setPending(false);
      setError(payload.error ?? "Validation impossible.");
      return;
    }

    setPending(false);
    setCompletionEvent(payload.completionEvent);
  }

  function closeCelebration() {
    setCompletionEvent(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid justify-items-end gap-2">
        {confirming ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-semibold text-emerald-800">
              Confirmer le 100 % de {gameName} ?
            </span>
            <button
              className="min-h-9 rounded-md bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:bg-stone-400"
              disabled={pending}
              onClick={validate}
              type="button"
            >
              {pending ? "Validation..." : "Confirmer"}
            </button>
            <button
              className="min-h-9 rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
              disabled={pending}
              onClick={() => setConfirming(false)}
              type="button"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            className="min-h-9 rounded-md border border-emerald-700 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Valider le 100 % RA
          </button>
        )}
        {error ? (
          <span className="text-xs font-semibold text-red-700">{error}</span>
        ) : null}
      </div>

      {completionEvent ? (
        <CompletionCelebration
          events={[completionEvent]}
          onClose={closeCelebration}
        />
      ) : null}
    </>
  );
}
