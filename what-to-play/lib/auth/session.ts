import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEVELOPMENT_COOKIE = "wtp_session";
const PRODUCTION_COOKIE = "__Host-wtp_session";

type SessionPayload = {
  exp: number;
  iat: number;
  steamId: string;
};

function getSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_COOKIE
    : DEVELOPMENT_COOKIE;
}

function getSessionSecret() {
  const secret = requireEnv("SESSION_SECRET");

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(`session:${value}`)
    .digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value), "base64url");
  const actual = Buffer.from(signature, "base64url");

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

function createSessionToken(steamId: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
    steamId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token: string) {
  const [encoded, signature, extra] = token.split(".");

  if (!encoded || !signature || extra || !verifySignature(encoded, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (
      !/^\d{17}$/.test(payload.steamId) ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > now + 60 ||
      payload.exp <= now ||
      payload.exp - payload.iat !== SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSteamSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;

  if (!raw) {
    return null;
  }

  const payload = verifySessionToken(raw);
  return payload ? { steamId: payload.steamId } : null;
}

export function setSteamSession(response: NextResponse, steamId: string) {
  response.cookies.set(getSessionCookieName(), createSessionToken(steamId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  });
}

export function clearSteamSession(response: NextResponse) {
  for (const name of [DEVELOPMENT_COOKIE, PRODUCTION_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: name === PRODUCTION_COOKIE,
      path: "/",
      maxAge: 0,
    });
  }
}
