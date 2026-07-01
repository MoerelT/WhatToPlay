import type { LibrarySource } from "@/lib/sources/types";
import { getEffectiveGameMetadata } from "@/lib/enrichment/game-metadata";
import type { GameMetadata } from "@/types/game-metadata";

function categoryLabel(value: string | undefined) {
  if (value === "easy" || value === "short") return "Easy";
  if (value === "hard" || value === "long") return "Hard";
  if (value === "medium") return "Medium";
  return "Inconnue";
}

function sourceLabel(source?: LibrarySource, catalogOrigin?: string) {
  if (catalogOrigin === "steam_family") return "Steam Family";
  if (catalogOrigin === "instant_gaming") return "Instant Gaming";
  if (catalogOrigin === "manual_steam") return "Ajout manuel Steam";
  if (source === "steam_wishlist") return "Wishlist Steam";
  if (source === "retroachievements") return "RetroAchievements";
  return "Bibliotheque Steam";
}

export function GameBadges({
  catalogOrigin,
  eligible,
  metadata,
  source,
  status,
}: {
  catalogOrigin?: string;
  eligible?: boolean;
  metadata: GameMetadata;
  source?: LibrarySource;
  status: "excluded" | "included";
}) {
  const effectiveMetadata = getEffectiveGameMetadata(metadata);
  const difficulty = categoryLabel(effectiveMetadata.difficulty_category);
  const duration = categoryLabel(effectiveMetadata.duration_category);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold uppercase">
      <span className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">
        {sourceLabel(source, catalogOrigin)}
      </span>
      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
        Difficulte {difficulty}
        {typeof metadata.difficulty_score === "number"
          ? ` (${metadata.difficulty_score}/10)`
          : ""}
      </span>
      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
        Duree {duration}
        {typeof metadata.hltb_hours === "number"
          ? ` (${Math.ceil(metadata.hltb_hours)} h)`
          : ""}
      </span>
      <span
        className={
          status === "included"
            ? "rounded border border-green-200 bg-green-50 px-2 py-1 text-green-800"
            : "rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800"
        }
      >
        {status === "included" ? "Inclus" : "Exclu"}
      </span>
      {status === "included" && eligible === false ? (
        <span className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-orange-800">
          En attente de la serie
        </span>
      ) : null}
    </div>
  );
}
