import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

const LOGIN_STATE_TTL_SECONDS = 10 * 60;
const DEVELOPMENT_COOKIE = "wtp_openid_state";
const PRODUCTION_COOKIE = "__Host-wtp_openid_state";

export function getLoginStateCookieName() {
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_COOKIE
    : DEVELOPMENT_COOKIE;
}

export function createLoginState() {
  return randomBytes(32).toString("base64url");
}

export function setLoginState(response: NextResponse, state: string) {
  response.cookies.set(getLoginStateCookieName(), state, {
    httpOnly: true,
    maxAge: LOGIN_STATE_TTL_SECONDS,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearLoginState(response: NextResponse) {
  for (const name of [DEVELOPMENT_COOKIE, PRODUCTION_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: name === PRODUCTION_COOKIE,
    });
  }
}

export function verifyLoginState(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
