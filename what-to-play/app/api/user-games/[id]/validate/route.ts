import { NextRequest, NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { completeRetroAchievementsGame } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";

const validations = new Set(["achievements"]);

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/user-games/[id]/validate">,
) {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = (await request.json()) as { validation?: string };

  if (!validations.has(body.validation ?? "")) {
    return NextResponse.json({ error: "Invalid validation" }, { status: 400 });
  }

  const { id } = await context.params;
  const completionEvent = await completeRetroAchievementsGame(profile.id, id);

  if (!completionEvent) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({ completionEvent });
}
