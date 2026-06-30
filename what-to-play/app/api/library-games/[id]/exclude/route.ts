import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { excludeLibraryGame } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/library-games/[id]/exclude">,
) {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const excluded = await excludeLibraryGame(profile.id, id);

  if (!excluded) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({ game: excluded });
}
