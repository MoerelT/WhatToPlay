import { NextResponse } from "next/server";
import {
  createLoginState,
  setLoginState,
} from "@/lib/auth/login-state";
import { buildSteamLoginUrl } from "@/lib/steam/openid";

export const runtime = "nodejs";

export async function GET() {
  const state = createLoginState();
  const response = NextResponse.redirect(buildSteamLoginUrl(state));
  response.headers.set("Cache-Control", "no-store");
  setLoginState(response, state);
  return response;
}
