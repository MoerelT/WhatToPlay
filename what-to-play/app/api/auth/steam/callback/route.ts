import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import {
  clearLoginState,
  getLoginStateCookieName,
  verifyLoginState,
} from "@/lib/auth/login-state";
import { setSteamSession } from "@/lib/auth/session";
import { getSteamPlayer, isSteamProfilePublic } from "@/lib/steam/api";
import { verifySteamCallback } from "@/lib/steam/openid";
import { upsertSteamProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(getLoginStateCookieName())?.value;

  function redirectToLogin(error: string) {
    const response = NextResponse.redirect(
      `${getAppUrl()}/login?error=${error}`,
    );
    response.headers.set("Cache-Control", "no-store");
    clearLoginState(response);
    return response;
  }

  if (
    !state ||
    !expectedState ||
    !verifyLoginState(expectedState, state)
  ) {
    return redirectToLogin("steam-auth");
  }

  let steamId: string | null = null;

  try {
    steamId = await verifySteamCallback(request.nextUrl.searchParams, state);
  } catch (error) {
    console.error("Steam OpenID verification failed", error);
    return redirectToLogin("steam-auth");
  }

  if (!steamId) {
    return redirectToLogin("steam-auth");
  }

  try {
    const player = await getSteamPlayer(steamId);
    const isPublic = isSteamProfilePublic(player);

    await upsertSteamProfile(steamId, player, isPublic);

    const response = NextResponse.redirect(
      `${getAppUrl()}/dashboard${isPublic ? "" : "?error=private-profile"}`,
    );
    response.headers.set("Cache-Control", "no-store");
    setSteamSession(response, steamId);
    clearLoginState(response);

    return response;
  } catch (error) {
    console.error("Steam callback profile setup failed", error);

    if (error instanceof Error && error.message.includes("Invalid API key")) {
      return redirectToLogin("supabase-key");
    }

    return redirectToLogin("supabase-setup");
  }
}
