"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SteamSearchResult = {
  id: number;
  name: string;
  tiny_image?: string;
};

export function SteamGameAdder() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SteamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setMessage(null);

      try {
        const response = await fetch(
          `/api/games/steam?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          error?: string;
          results?: SteamSearchResult[];
        };

        if (!response.ok) {
          setMessage({
            kind: "error",
            text: payload.error ?? "Recherche Steam impossible.",
          });
          setResults([]);
          return;
        }

        setResults(payload.results ?? []);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setMessage({
            kind: "error",
            text: "Recherche Steam impossible.",
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      setMessage(null);
    }
  }

  async function addGame(game: SteamSearchResult) {
    setAddingId(game.id);
    setMessage(null);

    try {
      const response = await fetch("/api/games/steam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appid: game.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: "added" | "updated";
      };

      if (!response.ok) {
        setMessage({
          kind: "error",
          text: payload.error ?? "Ajout impossible.",
        });
        return;
      }

      setMessage({
        kind: "success",
        text:
          payload.status === "updated"
            ? `${game.name} est deja inclus et vient d'etre actualise.`
            : `${game.name} a ete ajoute aux jeux inclus.`,
      });
      setQuery("");
      setResults([]);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Ajout impossible." });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="grid gap-4 border-y border-stone-200 py-5">
      <div>
        <h2 className="text-xl font-black text-stone-950">
          Ajouter un jeu Steam
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Recherche un nom, colle une URL de page Steam ou saisis un AppID.
        </p>
      </div>

      <label className="grid max-w-2xl gap-1.5">
        <span className="text-xs font-bold uppercase text-stone-500">
          Jeu Steam
        </span>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Persona 3 Reload ou https://store.steampowered.com/app/2161700"
          type="search"
          value={query}
        />
      </label>

      {isSearching ? (
        <p className="text-sm font-semibold text-stone-500">
          Recherche sur Steam...
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid max-w-3xl gap-2">
          {results.map((game) => (
            <article
              className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 border-b border-stone-200 bg-white p-2 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
              key={game.id}
            >
              {game.tiny_image ? (
                <Image
                  alt=""
                  className="h-10 w-24 rounded object-cover"
                  height={40}
                  src={game.tiny_image}
                  width={96}
                />
              ) : (
                <div className="h-10 w-24 rounded bg-stone-200" />
              )}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-stone-950">
                  {game.name}
                </h3>
                <p className="text-xs text-stone-500">AppID {game.id}</p>
              </div>
              <button
                className="col-span-2 min-h-9 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:bg-stone-300 sm:col-span-1"
                disabled={addingId !== null}
                onClick={() => addGame(game)}
                type="button"
              >
                {addingId === game.id ? "Ajout..." : "Ajouter"}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {hasSearched && !isSearching && results.length === 0 ? (
        <p className="text-sm font-semibold text-stone-500">
          Aucun jeu Steam trouve.
        </p>
      ) : null}

      {message ? (
        <p
          className={
            message.kind === "success"
              ? "text-sm font-bold text-emerald-700"
              : "text-sm font-bold text-red-700"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
