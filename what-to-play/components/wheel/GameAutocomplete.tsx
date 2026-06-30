"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type Candidate = {
  game_id: string;
  games: {
    name: string;
  };
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

export function GameAutocomplete({
  candidates,
  disabled,
  onSelect,
}: {
  candidates: Candidate[];
  disabled: boolean;
  onSelect: (gameId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sortedCandidates = useMemo(
    () =>
      [...candidates].sort((left, right) =>
        left.games.name.localeCompare(right.games.name, "fr", {
          sensitivity: "base",
        }),
      ),
    [candidates],
  );
  const filteredCandidates = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    if (!normalizedQuery) {
      return sortedCandidates;
    }

    return sortedCandidates.filter((candidate) =>
      normalize(candidate.games.name).includes(normalizedQuery),
    );
  }, [query, sortedCandidates]);

  useEffect(() => {
    function closeOnOutsideClick(pointerEvent: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(pointerEvent.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function selectCandidate(candidate: Candidate) {
    setQuery(candidate.games.name);
    onSelect(candidate.game_id);
    setOpen(false);
  }

  function handleKeyDown(keyboardEvent: KeyboardEvent<HTMLInputElement>) {
    if (keyboardEvent.key === "Escape") {
      setOpen(false);
      return;
    }

    if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();

      if (filteredCandidates.length === 0) {
        return;
      }

      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }

      setOpen(true);
      setActiveIndex((current) =>
        Math.min(current + 1, filteredCandidates.length - 1),
      );
      return;
    }

    if (keyboardEvent.key === "ArrowUp") {
      keyboardEvent.preventDefault();

      if (filteredCandidates.length === 0) {
        return;
      }

      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (
      keyboardEvent.key === "Enter" &&
      open &&
      filteredCandidates[activeIndex]
    ) {
      keyboardEvent.preventDefault();
      selectCandidate(filteredCandidates[activeIndex]);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          aria-autocomplete="list"
          aria-controls="wheel-game-results"
          aria-expanded={open}
          className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 pr-11 text-sm font-semibold text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            onSelect("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            candidates.length > 0
              ? "Rechercher un jeu..."
              : "Aucun jeu disponible"
          }
          role="combobox"
          type="text"
          value={query}
        />
        <button
          aria-label="Afficher tous les jeux"
          className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-sm text-stone-600 transition hover:bg-stone-100 disabled:text-stone-300"
          disabled={disabled}
          onClick={() => {
            setQuery("");
            setActiveIndex(0);
            onSelect("");
            setOpen((current) => !current);
          }}
          title="Afficher tous les jeux"
          type="button"
        >
          ▼
        </button>
      </div>

      {open && !disabled ? (
        <div
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-stone-300 bg-white p-1 shadow-xl"
          id="wheel-game-results"
          role="listbox"
        >
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate, index) => (
              <button
                aria-selected={index === activeIndex}
                className={
                  "block min-h-10 w-full rounded px-3 py-2 text-left text-sm font-semibold transition " +
                  (index === activeIndex
                    ? "bg-emerald-50 text-emerald-950"
                    : "text-stone-800 hover:bg-stone-100")
                }
                key={candidate.game_id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectCandidate(candidate)}
                role="option"
                type="button"
              >
                {candidate.games.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm font-medium text-stone-500">
              Aucun résultat.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
