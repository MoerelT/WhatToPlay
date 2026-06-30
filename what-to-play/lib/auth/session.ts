import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

const SESSION_COOKIE = "wtp_session";

function sign(steamId: string) {
  return createHmac("sha256", requireEnv("SESSION_SECRET"))
    .update(steamId)
    .digest("hex");
}

function verify(steamId: string, signature: string) {
  const expected = Buffer.from(sign(steamId), "hex");
  const actual = Buffer.from(signature, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getSteamSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const [steamId, signature] = raw.split(".");

  if (!steamId || !signature || !verify(steamId, signature)) {
    return null;
  }

  return { steamId };
}

export function setSteamSession(response: NextResponse, steamId: string) {
  response.cookies.set(SESSION_COOKIE, `${steamId}.${sign(steamId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSteamSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
