import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/steam/openid";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.redirect(buildSteamLoginUrl());
}
