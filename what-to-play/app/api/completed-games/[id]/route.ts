import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { getProfileBySteamId } from "@/lib/profiles";
import { removeRetroAchievementsCompletion } from "@/lib/ranking/queries";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/completed-games/[id]">,
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
  const removed = await removeRetroAchievementsCompletion(profile.id, id);

  if (!removed) {
    return NextResponse.json(
      { error: "Completion RetroAchievements not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ removed: true });
}
