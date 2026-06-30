import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { restoreExcludedGame } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/user-games/[id]/restore">,
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
  const restored = await restoreExcludedGame(profile.id, id);

  if (!restored) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({ game: restored });
}
