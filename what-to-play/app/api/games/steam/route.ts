import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { addManualSteamGame } from "@/lib/games/manual-steam";
import { getProfileBySteamId } from "@/lib/profiles";
import {
  getSteamStoreMetadata,
  searchSteamStoreGames,
} from "@/lib/steam/api";

export const runtime = "nodejs";

function parseSteamAppId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /(?:store\.steampowered\.com\/app\/)?(\d{2,10})(?:\/|$)/i,
  );

  if (!match) {
    return null;
  }

  const appid = Number(match[1]);
  return Number.isSafeInteger(appid) && appid > 0 ? appid : null;
}

async function getAuthenticatedProfile() {
  const session = await getSteamSession();

  if (!session) {
    return null;
  }

  const profile = await getProfileBySteamId(session.steamId);
  return profile ? { profile, session } : null;
}

export async function GET(request: Request) {
  const authenticated = await getAuthenticatedProfile();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const appid = parseSteamAppId(query);

  if (appid) {
    const game = await getSteamStoreMetadata(appid);

    return NextResponse.json({
      results: game?.name
        ? [
            {
              id: appid,
              name: game.name,
              tiny_image: game.headerUrl,
            },
          ]
        : [],
    });
  }

  const results = await searchSteamStoreGames(query);
  return NextResponse.json({ results });
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedProfile();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { appid?: number | string };

  try {
    body = (await request.json()) as { appid?: number | string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const appid = parseSteamAppId(String(body.appid ?? ""));

  if (!appid) {
    return NextResponse.json({ error: "AppID Steam invalide." }, { status: 400 });
  }

  const result = await addManualSteamGame(
    authenticated.profile.id,
    authenticated.session.steamId,
    appid,
  );

  if (result.status === "not_found") {
    return NextResponse.json(
      { error: "Jeu introuvable sur Steam." },
      { status: 404 },
    );
  }

  if (result.status === "no_achievements") {
    return NextResponse.json(
      { error: "Ce jeu ne possede pas de succes Steam." },
      { status: 422 },
    );
  }

  return NextResponse.json(result);
}
