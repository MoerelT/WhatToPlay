import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { setSteamSession } from "@/lib/auth/session";
import { getSteamPlayer, isSteamProfilePublic } from "@/lib/steam/api";
import { verifySteamCallback } from "@/lib/steam/openid";
import { upsertSteamProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let steamId: string | null = null;

  try {
    steamId = await verifySteamCallback(request.nextUrl.searchParams);
  } catch (error) {
    console.error("Steam OpenID verification failed", error);
    return NextResponse.redirect(`${getAppUrl()}/login?error=steam-auth`);
  }

  if (!steamId) {
    return NextResponse.redirect(`${getAppUrl()}/login?error=steam-auth`);
  }

  try {
    const player = await getSteamPlayer(steamId);
    const isPublic = isSteamProfilePublic(player);

    await upsertSteamProfile(steamId, player, isPublic);

    const response = NextResponse.redirect(
      `${getAppUrl()}/dashboard${isPublic ? "" : "?error=private-profile"}`,
    );
    setSteamSession(response, steamId);

    return response;
  } catch (error) {
    console.error("Steam callback profile setup failed", error);

    if (error instanceof Error && error.message.includes("Invalid API key")) {
      return NextResponse.redirect(`${getAppUrl()}/login?error=supabase-key`);
    }

    return NextResponse.redirect(`${getAppUrl()}/login?error=supabase-setup`);
  }
}
