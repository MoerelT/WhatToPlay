import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { clearSteamSession } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.redirect(`${getAppUrl()}/login`);
  clearSteamSession(response);

  return response;
}
