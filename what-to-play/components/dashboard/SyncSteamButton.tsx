"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CompletionCelebration,
  type CompletionEvent,
} from "@/components/dashboard/CompletionCelebration";

export function SyncSteamButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [completionEvents, setCompletionEvents] = useState<CompletionEvent[]>(
    [],
  );

  async function syncLibrary() {
    setState("loading");
    setMessage("");

    const response = await fetch("/api/steam/sync", { method: "POST" });
    const payload = (await response.json()) as {
      completed?: number;
      completionEvents?: CompletionEvent[];
      error?: string;
      imported?: number;
      wishlistImported?: number;
    };

    if (!response.ok) {
      setState("error");
      setMessage(payload.error ?? "Synchronisation impossible.");
      return;
    }

    setState("done");
    setCompletionEvents(payload.completionEvents ?? []);
    setMessage(
      `${payload.imported ?? 0} jeux Steam et ${
        payload.wishlistImported ?? 0
      } souhaits synchronises, ${
        payload.completed ?? 0
      } termines automatiquement.`,
    );
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="grid gap-1">
          <button
            className="min-h-10 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={state === "loading"}
            onClick={syncLibrary}
            type="button"
          >
            {state === "loading" ? "Synchronisation..." : "Synchroniser Steam"}
          </button>
          <p className="max-w-xs text-xs font-medium text-stone-500">
            Met a jour ta bibliotheque, tes succes et les infos duree/difficulte.
          </p>
        </div>
        {message ? (
          <span
            className={
              "text-sm font-medium " +
              (state === "error" ? "text-red-700" : "text-emerald-800")
            }
          >
            {message}
          </span>
        ) : null}
      </div>

      {completionEvents.length > 0 ? (
        <CompletionCelebration
          events={completionEvents}
          onClose={() => setCompletionEvents([])}
        />
      ) : null}
    </>
  );
}
