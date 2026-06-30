import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { createImportToken } from "@/lib/import/token";
import { getProfileBySteamId } from "@/lib/profiles";

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

  return NextResponse.json({
    expiresInSeconds: 900,
    token: createImportToken(profile.id),
  });
}
