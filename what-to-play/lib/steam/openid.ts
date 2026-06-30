import { getAppUrl } from "@/lib/env";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_CLAIM_PREFIXES = [
  "https://steamcommunity.com/openid/id/",
  "http://steamcommunity.com/openid/id/",
];

export function buildSteamLoginUrl() {
  const callbackUrl = `${getAppUrl()}/api/auth/steam/callback`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl,
    "openid.realm": getAppUrl(),
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id":
      "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export async function verifySteamCallback(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  params.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });

  const body = await response.text();
  const claimedId = searchParams.get("openid.claimed_id");
  const prefix = STEAM_CLAIM_PREFIXES.find((item) => claimedId?.startsWith(item));

  if (!body.includes("is_valid:true") || !claimedId || !prefix) {
    return null;
  }

  return claimedId.slice(prefix.length);
}
