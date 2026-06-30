import { selectRows, upsertRows } from "@/lib/supabase/rest";
import type { ProfileRow } from "@/types/database";
import type { SteamPlayerSummary } from "@/types/steam";

export async function getProfileBySteamId(steamId: string) {
  const rows = await selectRows<ProfileRow>("profiles", {
    steam_id: `eq.${steamId}`,
    select: "*",
    limit: 1,
  });

  return rows[0] ?? null;
}

export async function upsertSteamProfile(
  steamId: string,
  player: SteamPlayerSummary | null,
  isPublic: boolean,
) {
  const rows = await upsertRows<ProfileRow>(
    "profiles",
    [
      {
        steam_id: steamId,
        display_name: player?.personaname ?? null,
        avatar_url: player?.avatarfull ?? null,
        profile_url: player?.profileurl ?? null,
        is_steam_profile_public: isPublic,
      },
    ],
    "steam_id",
  );

  return rows[0];
}
