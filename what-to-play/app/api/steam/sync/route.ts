import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { completeAchievementFinishedGames } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";
import { steamSource } from "@/lib/sources/steam-source";
import { steamWishlistSource } from "@/lib/sources/steam-wishlist-source";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.is_steam_profile_public) {
    return NextResponse.json(
      {
        error:
          "Ton profil Steam doit etre public pour synchroniser la bibliotheque.",
      },
      { status: 403 },
    );
  }

  const [imported, wishlistImported] = await Promise.all([
    steamSource.sync(profile.id, session.steamId),
    steamWishlistSource.sync(profile.id, session.steamId),
  ]);
  const completion = await completeAchievementFinishedGames(profile.id);

  return NextResponse.json({
    completed: completion.count,
    completionEvents: completion.events,
    imported,
    wishlistImported,
  });
}
