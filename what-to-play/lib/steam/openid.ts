import { getAppUrl } from "@/lib/env";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_CLAIM_PREFIX = "https://steamcommunity.com/openid/id/";
const OPENID_NAMESPACE = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT =
  "http://specs.openid.net/auth/2.0/identifier_select";
const REQUIRED_SIGNED_FIELDS = [
  "op_endpoint",
  "claimed_id",
  "identity",
  "return_to",
  "response_nonce",
];

function getCallbackUrl(state: string) {
  const callbackUrl = new URL("/api/auth/steam/callback", getAppUrl());
  callbackUrl.searchParams.set("state", state);
  return callbackUrl.toString();
}

export function buildSteamLoginUrl(state: string) {
  const callbackUrl = getCallbackUrl(state);
  const params = new URLSearchParams({
    "openid.ns": OPENID_NAMESPACE,
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl,
    "openid.realm": getAppUrl(),
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

function parseDirectResponse(body: string) {
  const values = new Map<string, string>();

  for (const line of body.split(/\r?\n/)) {
    const separator = line.indexOf(":");

    if (separator > 0) {
      values.set(line.slice(0, separator), line.slice(separator + 1));
    }
  }

  return values;
}

export async function verifySteamCallback(
  searchParams: URLSearchParams,
  state: string,
) {
  const claimedId = searchParams.get("openid.claimed_id");
  const identity = searchParams.get("openid.identity");
  const signedFields = new Set(
    (searchParams.get("openid.signed") ?? "").split(","),
  );
  const expectedReturnTo = getCallbackUrl(state);

  if (
    searchParams.get("openid.ns") !== OPENID_NAMESPACE ||
    searchParams.get("openid.mode") !== "id_res" ||
    searchParams.get("openid.op_endpoint") !== STEAM_OPENID_URL ||
    searchParams.get("openid.return_to") !== expectedReturnTo ||
    !claimedId ||
    claimedId !== identity ||
    !claimedId.startsWith(STEAM_CLAIM_PREFIX) ||
    !REQUIRED_SIGNED_FIELDS.every((field) => signedFields.has(field))
  ) {
    return null;
  }

  const steamId = claimedId.slice(STEAM_CLAIM_PREFIX.length);

  if (!/^\d{17}$/.test(steamId)) {
    return null;
  }

  const params = new URLSearchParams();

  for (const [key, value] of searchParams) {
    if (key.startsWith("openid.")) {
      params.append(key, value);
    }
  }

  params.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return null;
  }

  const directResponse = parseDirectResponse(await response.text());

  return directResponse.get("is_valid") === "true" ? steamId : null;
}
